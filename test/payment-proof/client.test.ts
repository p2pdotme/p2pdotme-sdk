import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPaymentProof } from "../../src/payment-proof";

const API = "https://proof.example.com";
const ADDRESS = "0x1111111111111111111111111111111111111111";

interface Route {
	status: number;
	json: unknown;
}

/** Minimal fetch stub keyed by `METHOD path`. */
function stubFetch(routes: Record<string, Route>) {
	return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input));
		const method = init?.method ?? "GET";
		const key = `${method} ${url.pathname}`;
		const route = routes[key];
		if (!route) throw new TypeError(`no stub for ${key}`);
		return {
			ok: route.status >= 200 && route.status < 300,
			status: route.status,
			json: async () => route.json,
			arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
		} as unknown as Response;
	});
}

function makeSdk(fetchStub: ReturnType<typeof stubFetch>) {
	return createPaymentProof({
		apiUrl: API,
		address: ADDRESS,
		chainId: 8453,
		signMessage: async () => "0xsig",
		fetch: fetchStub as unknown as typeof fetch,
	});
}

const SESSION_ROUTE: Record<string, Route> = {
	"POST /auth/session": {
		status: 200,
		json: { token: "tok", expiresAt: Date.now() + 60_000, address: ADDRESS },
	},
};

describe("createPaymentProof", () => {
	beforeEach(() => vi.clearAllMocks());

	it("getPublicConfig reads without signing in", async () => {
		const signMessage = vi.fn(async () => "0xsig");
		const sdk = createPaymentProof({
			apiUrl: API,
			address: ADDRESS,
			chainId: 8453,
			signMessage,
			fetch: stubFetch({
				"GET /public/config": {
					status: 200,
					json: { ignoredCurrencies: ["INR"], requestWindowHours: 48 },
				},
			}) as unknown as typeof fetch,
		});

		const res = await sdk.getPublicConfig();
		expect(res.isOk()).toBe(true);
		expect(res._unsafeUnwrap().ignoredCurrencies).toEqual(["INR"]);
		expect(signMessage).not.toHaveBeenCalled();
	});

	it("getOrderProofRequest returns the request (null when none)", async () => {
		const sdk = makeSdk(
			stubFetch({
				...SESSION_ROUTE,
				"GET /orders/42/proof-requests": {
					status: 200,
					json: { request: { id: "r1", orderId: "42", status: "PENDING" } },
				},
			}),
		);

		const res = await sdk.getOrderProofRequest({ orderId: "42" });
		expect(res.isOk()).toBe(true);
		expect(res._unsafeUnwrap()?.status).toBe("PENDING");
	});

	it("requestProof surfaces server error codes as API_ERROR + apiCode", async () => {
		const sdk = makeSdk(
			stubFetch({
				...SESSION_ROUTE,
				"POST /orders/42/proof-requests": {
					status: 409,
					json: { error: "WINDOW_EXPIRED" },
				},
			}),
		);

		const res = await sdk.requestProof({ orderId: "42" });
		expect(res.isErr()).toBe(true);
		const error = res._unsafeUnwrapErr();
		expect(error.code).toBe("API_ERROR");
		expect(error.context?.apiCode).toBe("WINDOW_EXPIRED");
		expect(error.context?.status).toBe(409);
	});

	it("rejects empty orderId with VALIDATION_ERROR before any fetch", async () => {
		const fetchStub = stubFetch({});
		const sdk = makeSdk(fetchStub);

		const res = await sdk.getOrderProofRequest({ orderId: "" });
		expect(res.isErr()).toBe(true);
		expect(res._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
		expect(fetchStub).not.toHaveBeenCalled();
	});

	it("downloadProof fetches a token then the bytes", async () => {
		const sdk = makeSdk(
			stubFetch({
				...SESSION_ROUTE,
				"GET /proof-requests/r1/files/f1/token": {
					status: 200,
					json: { token: "dl", expiresAt: Date.now() + 60_000 },
				},
				"GET /proof-requests/r1/files/f1": { status: 200, json: {} },
			}),
		);

		const res = await sdk.downloadProof({ requestId: "r1", fileId: "f1" });
		expect(res.isOk()).toBe(true);
		expect(res._unsafeUnwrap()).toEqual(new Uint8Array([1, 2, 3]));
	});
});
