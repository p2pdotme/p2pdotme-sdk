import { ResultAsync } from "neverthrow";
import { SdkError } from "../validation";
import { sleep } from "./sleep";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const BACKOFF_MS = 500;

export type SubgraphErrorCode = "HTTP_ERROR" | "GRAPHQL_ERROR" | "NO_DATA" | "TRANSPORT_ERROR";

/** Transport-level error from the shared subgraph client. Consumers remap to their own domain error. */
export class SubgraphError extends SdkError<SubgraphErrorCode> {
	constructor(
		message: string,
		options: {
			code: SubgraphErrorCode;
			cause?: unknown;
			context?: Record<string, unknown>;
		},
	) {
		super(message, options);
		this.name = "SubgraphError";
	}
}

export interface SubgraphQueryParams {
	readonly query: string;
	readonly variables?: Record<string, unknown>;
	readonly timeoutMs?: number;
}

function isTransient(error: unknown): boolean {
	if (error instanceof SubgraphError) {
		if (error.code !== "HTTP_ERROR") return false;
		const status = (error.context as { status?: number } | undefined)?.status;
		return typeof status === "number" && status >= 500;
	}
	if (error instanceof DOMException && error.name === "AbortError") return true;
	if (error instanceof TypeError) return true;
	return false;
}

/**
 * POSTs a GraphQL query to `url` with retry + timeout. Returns the `data` field on
 * success. All transport and GraphQL-level failures surface as `SubgraphError`.
 */
export function querySubgraph(
	url: string,
	params: SubgraphQueryParams,
): ResultAsync<unknown, SubgraphError> {
	const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

	const fetchOnce = async () => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					query: params.query,
					variables: params.variables,
				}),
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new SubgraphError(`Subgraph request failed (status: ${response.status})`, {
					code: "HTTP_ERROR",
					cause: response,
					context: { status: response.status },
				});
			}

			const json = await response.json();

			if (json.errors?.length > 0) {
				throw new SubgraphError("Subgraph returned GraphQL errors", {
					code: "GRAPHQL_ERROR",
					cause: json.errors,
					context: { errors: json.errors },
				});
			}

			if (!json.data) {
				throw new SubgraphError("Subgraph returned no data", {
					code: "NO_DATA",
					cause: "Missing data field in GraphQL response",
					context: { response: json },
				});
			}

			return json.data;
		} finally {
			clearTimeout(timer);
		}
	};

	const fetchWithRetry = async () => {
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				return await fetchOnce();
			} catch (error) {
				const lastAttempt = attempt === MAX_RETRIES;
				if (lastAttempt || !isTransient(error)) throw error;
				await sleep(BACKOFF_MS * (attempt + 1));
			}
		}
		throw new SubgraphError("Subgraph query exhausted retries", { code: "TRANSPORT_ERROR" });
	};

	return ResultAsync.fromPromise(fetchWithRetry(), (error) =>
		error instanceof SubgraphError
			? error
			: new SubgraphError("Subgraph query failed", {
					code: "TRANSPORT_ERROR",
					cause: error,
				}),
	);
}
