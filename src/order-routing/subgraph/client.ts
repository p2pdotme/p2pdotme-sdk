import { ResultAsync } from "neverthrow";
import { sleep } from "../../lib";
import { OrderRoutingError } from "../errors";

/** Abort the fetch if the subgraph doesn't respond within 10 seconds. */
const DEFAULT_TIMEOUT_MS = 10_000;
/** Retry up to 3 times after a transient failure (timeout or network error) before giving up. */
const MAX_RETRIES = 3;
/** Wait 500ms before the first retry; scales linearly (500ms × attempt) on subsequent retries. */
const BACKOFF_MS = 500;

export interface SubgraphQueryParams {
	readonly query: string;
	readonly variables?: Record<string, unknown>;
	/** Fetch timeout in milliseconds. Defaults to 10 000. */
	readonly timeoutMs?: number;
}

/** Returns true for errors worth retrying (network failures, timeouts). */
function isTransient(error: unknown): boolean {
	if (error instanceof OrderRoutingError) return false;
	if (error instanceof DOMException && error.name === "AbortError") return true;
	if (error instanceof TypeError) return true; // fetch network error
	return false;
}

export function querySubgraph(
	url: string,
	params: SubgraphQueryParams,
): ResultAsync<unknown, OrderRoutingError> {
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
				throw new OrderRoutingError(`Subgraph request failed (status: ${response.status})`, {
					code: "SUBGRAPH_ERROR",
					cause: response,
					context: { status: response.status },
				});
			}

			const json = await response.json();

			if (json.errors?.length > 0) {
				throw new OrderRoutingError("Subgraph returned GraphQL errors", {
					code: "SUBGRAPH_ERROR",
					cause: json.errors,
					context: { errors: json.errors },
				});
			}

			if (!json.data) {
				throw new OrderRoutingError("Subgraph returned no data", {
					code: "SUBGRAPH_ERROR",
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
		// Unreachable — the loop always returns or throws
		throw new OrderRoutingError("Subgraph query exhausted retries", {
			code: "SUBGRAPH_ERROR",
		});
	};

	return ResultAsync.fromPromise(fetchWithRetry(), (error) =>
		error instanceof OrderRoutingError
			? error
			: new OrderRoutingError("Subgraph query failed", {
					code: "SUBGRAPH_ERROR",
					cause: error,
				}),
	);
}
