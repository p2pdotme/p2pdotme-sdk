import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@seontechnologies/seon-javascript-sdk", () => ({
	default: {
		init: vi.fn(),
		getSession: vi.fn().mockResolvedValue("mock-seon-session"),
	},
}));

vi.mock("@fingerprintjs/fingerprintjs", () => ({
	default: {
		load: vi.fn().mockResolvedValue({
			get: vi.fn().mockResolvedValue({
				visitorId: "mock-visitor-id",
				confidence: { score: 0.95 },
			}),
		}),
	},
}));

import { createFraudEngine } from "../../src/fraud-engine/client";
import * as deviceModule from "../../src/fraud-engine/device";
import type { BuyOrderDetails, FraudEngineSigner } from "../../src/fraud-engine/types";

const API_URL = "https://api.fraud.example.com";
// 32-byte hex key (64 hex characters)
const ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const MOCK_SIGNER: FraudEngineSigner = {
	address: "0x1234567890123456789012345678901234567890",
	signMessage: vi.fn().mockResolvedValue("0xmockedsignature"),
};

const MOCK_ORDER_DETAILS: BuyOrderDetails = {
	cryptoAmount: 100,
	fiatAmount: 100,
	currency: "INR",
	recipientAddress: "0x1234567890123456789012345678901234567890",
	fee: 1,
	amountAfterFee: 99,
};

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockImplementation((url: string, init?: RequestInit) => {
			return Promise.resolve(handler(url, init));
		}),
	);
}

describe("fraud-engine client response validation", () => {
	beforeEach(() => {
		vi.spyOn(deviceModule, "getDeviceDetails").mockResolvedValue({
			userAgent: "test-agent",
			platform: "test-platform",
			language: "en",
			languages: ["en"],
			screenWidth: 1920,
			screenHeight: 1080,
			devicePixelRatio: 1,
			timezone: "UTC",
			timezoneOffset: 0,
			cookiesEnabled: true,
			doNotTrack: null,
			online: true,
			touchSupport: false,
			maxTouchPoints: 0,
			vendor: "test-vendor",
			appVersion: "1.0",
			colorDepth: 24,
			pixelDepth: 24,
			ip: "127.0.0.1",
			seonSession: "mock-seon-session",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	// ── checkBuyOrder ──────────────────────────────────────────────────────────

	describe("checkBuyOrder", () => {
		it("accepts a valid fraud check response", async () => {
			mockFetch((url) => {
				if (url.includes("/activity-logs")) {
					return jsonResponse({
						success: true,
						approved: true,
						activity_log_id: 12345,
						message: "approved",
					});
				}
				return jsonResponse({});
			});

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});

			expect(result.isOk()).toBe(true);
			const data = result._unsafeUnwrap();
			expect(data.approved).toBe(true);
			expect(data.activityLogId).toBe(12345);
			expect(data.message).toBe("approved");
			expect(typeof data.linkOrder).toBe("function");
		});

		it("rejects a response missing approved", async () => {
			mockFetch((url) => {
				if (url.includes("/activity-logs")) {
					return jsonResponse({
						success: true,
						activity_log_id: 12345,
						message: "missing approved",
					});
				}
				return jsonResponse({});
			});

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});

			expect(result.isErr()).toBe(true);
			const error = result._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});

		it("rejects a response missing activity_log_id", async () => {
			mockFetch((url) => {
				if (url.includes("/activity-logs")) {
					return jsonResponse({
						success: true,
						approved: true,
						message: "missing activity_log_id",
					});
				}
				return jsonResponse({});
			});

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});

			expect(result.isErr()).toBe(true);
			const error = result._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});

		it("rejects a response with the wrong type for approved", async () => {
			mockFetch((url) => {
				if (url.includes("/activity-logs")) {
					return jsonResponse({
						success: true,
						approved: "true", // string instead of boolean
						activity_log_id: 12345,
						message: "wrong type for approved",
					});
				}
				return jsonResponse({});
			});

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});

			expect(result.isErr()).toBe(true);
			const error = result._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});

		it("rejects an empty object response", async () => {
			mockFetch(() => jsonResponse({}));

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});

			expect(result.isErr()).toBe(true);
			const error = result._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});
	});

	// ── linkOrder ──────────────────────────────────────────────────────────────

	describe("linkOrder", () => {
		it("accepts a valid link order response", async () => {
			mockFetch((url: string) => {
				if (url.includes("/link-order")) {
					return jsonResponse({
						success: true,
						message: "order linked successfully",
					});
				}
				return jsonResponse({
					success: true,
					approved: true,
					activity_log_id: 12345,
					message: "approved",
				});
			});

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const checkResult = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});
			expect(checkResult.isOk()).toBe(true);

			const linkResult = await checkResult._unsafeUnwrap().linkOrder("order_123");
			expect(linkResult.isOk()).toBe(true);
			expect(linkResult._unsafeUnwrap()).toEqual({
				success: true,
				message: "order linked successfully",
			});
		});

		it("rejects a response missing a required field (missing message)", async () => {
			mockFetch((url: string) => {
				if (url.includes("/link-order")) {
					return jsonResponse({
						success: true,
					});
				}
				return jsonResponse({
					success: true,
					approved: true,
					activity_log_id: 12345,
					message: "approved",
				});
			});

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const checkResult = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});
			expect(checkResult.isOk()).toBe(true);

			const linkResult = await checkResult._unsafeUnwrap().linkOrder("order_123");
			expect(linkResult.isErr()).toBe(true);
			const error = linkResult._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});

		it("rejects a response with an incorrect field type (success as string)", async () => {
			mockFetch((url: string) => {
				if (url.includes("/link-order")) {
					return jsonResponse({
						success: "true",
						message: "order linked",
					});
				}
				return jsonResponse({
					success: true,
					approved: true,
					activity_log_id: 12345,
					message: "approved",
				});
			});

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const checkResult = await engine.checkBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
			});
			expect(checkResult.isOk()).toBe(true);

			const linkResult = await checkResult._unsafeUnwrap().linkOrder("order_123");
			expect(linkResult.isErr()).toBe(true);
			const error = linkResult._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});
	});

	// ── logFingerprint ─────────────────────────────────────────────────────────

	describe("logFingerprint", () => {
		it("accepts a valid fingerprint log response", async () => {
			mockFetch(() =>
				jsonResponse({
					success: true,
					message: "fingerprint logged",
				}),
			);

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.logFingerprint({ signer: MOCK_SIGNER });

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toEqual({
				success: true,
				message: "fingerprint logged",
			});
		});

		it("rejects a malformed fingerprint log response (wrong types)", async () => {
			mockFetch(() =>
				jsonResponse({
					success: "true", // string instead of boolean
					message: 123, // number instead of string
				}),
			);

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.logFingerprint({ signer: MOCK_SIGNER });

			expect(result.isErr()).toBe(true);
			const error = result._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});

		it("rejects an empty object response", async () => {
			mockFetch(() => jsonResponse({}));

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.logFingerprint({ signer: MOCK_SIGNER });

			expect(result.isErr()).toBe(true);
			const error = result._unsafeUnwrapErr();
			expect(error.code).toBe("VALIDATION_ERROR");
		});
	});

	// ── processBuyOrder fail-open regression ───────────────────────────────────

	describe("processBuyOrder", () => {
		it("preserves fail-open behavior and does not throw unhandled runtime exceptions on malformed response", async () => {
			mockFetch(() =>
				jsonResponse({
					success: true,
					approved: "true", // invalid type: validation error triggers catch in processBuyOrder
				}),
			);

			const placeOrderMock = vi.fn().mockResolvedValue("onchain_order_456");

			const engine = createFraudEngine({ apiUrl: API_URL, encryptionKey: ENCRYPTION_KEY });
			const result = await engine.processBuyOrder({
				signer: MOCK_SIGNER,
				orderDetails: MOCK_ORDER_DETAILS,
				placeOrder: placeOrderMock,
			});

			expect(result.isOk()).toBe(true);
			expect(placeOrderMock).toHaveBeenCalledTimes(1);
			expect(result._unsafeUnwrap()).toEqual({
				status: "placed",
				orderId: "onchain_order_456",
			});
		});
	});
});
