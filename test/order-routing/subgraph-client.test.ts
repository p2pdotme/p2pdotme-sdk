import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { querySubgraph } from "../../src/order-routing/subgraph/client";

const URL = "https://subgraph.example.com/graphql";
const PARAMS = { query: "{ circles { id } }", timeoutMs: 50 };

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("querySubgraph", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// ── Happy path ──────────────────────────────────────────────────────

	it("returns data on successful response", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			jsonResponse({ data: { circles: [{ id: "1" }] } }),
		);

		const result = await querySubgraph(URL, PARAMS);
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ circles: [{ id: "1" }] });
	});

	// ── Non-transient errors (no retry) ─────────────────────────────────

	it("does not retry on HTTP 400", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(jsonResponse({}, 400));

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("SUBGRAPH_ERROR");
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it("does not retry on GraphQL errors", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				jsonResponse({ errors: [{ message: "syntax error" }] }),
			);

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().message).toBe("Subgraph returned GraphQL errors");
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it("does not retry when data field is missing", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(jsonResponse({ something: "else" }));

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().message).toBe("Subgraph returned no data");
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	// ── Transient errors (retry) ────────────────────────────────────────

	it("retries on network TypeError and succeeds", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ ok: true });
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it("retries on AbortError (timeout) and succeeds", async () => {
		const abortError = new DOMException("The operation was aborted", "AbortError");
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(abortError)
			.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isOk()).toBe(true);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it("gives up after MAX_RETRIES transient failures", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValue(new TypeError("Failed to fetch"));

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isErr()).toBe(true);
		// 1 initial + 3 retries = 4 total attempts
		expect(fetchSpy).toHaveBeenCalledTimes(4);
	});

	it("recovers on the last retry attempt", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValueOnce(jsonResponse({ data: { recovered: true } }));

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({ recovered: true });
		expect(fetchSpy).toHaveBeenCalledTimes(4);
	});

	// ── Backoff timing ──────────────────────────────────────────────────

	it("applies linear backoff between retries", async () => {
		const sleepSpy = await import("../../src/lib/sleep").then((m) =>
			vi.spyOn(m, "sleep").mockResolvedValue(undefined),
		);

		vi.spyOn(globalThis, "fetch").mockRejectedValue(
			new TypeError("Failed to fetch"),
		);

		await querySubgraph(URL, PARAMS);

		// sleep is called between retries: 500ms, 1000ms, 1500ms
		expect(sleepSpy).toHaveBeenCalledTimes(3);
		expect(sleepSpy).toHaveBeenNthCalledWith(1, 500);
		expect(sleepSpy).toHaveBeenNthCalledWith(2, 1000);
		expect(sleepSpy).toHaveBeenNthCalledWith(3, 1500);
	});

	// ── Mixed transient then non-transient ──────────────────────────────

	it("stops retrying when a non-transient error follows a transient one", async () => {
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValueOnce(jsonResponse({}, 500));

		const result = await querySubgraph(URL, PARAMS);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("SUBGRAPH_ERROR");
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	// ── Timeout ─────────────────────────────────────────────────────────

	it("passes abort signal to fetch", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return jsonResponse({ data: { ok: true } });
		});

		const result = await querySubgraph(URL, PARAMS);
		expect(result.isOk()).toBe(true);
	});
});
