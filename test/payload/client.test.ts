import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPublicClient, http, parseUnits } from "viem";
import { base } from "viem/chains";
import type { Address } from "viem";
import { createOrderRouter } from "../../src/order-routing/client";
import { createPayloadGenerator } from "../../src/payload/client";
import { createRelayIdentity, getRelayIdentity } from "../../src/payload/relay-identity";
import { decryptPaymentAddress } from "../../src/payload/crypto";
import { cipherParse } from "../../src/payload/ecies";

const SUBGRAPH_URL = process.env.SUBGRAPH_URL!;
const DIAMOND_CONTRACT_ADDRESS = process.env.DIAMOND_CONTRACT_ADDRESS! as Address;
const RPC_URL = process.env.RPC_URL!;
const USER_ADDRESS = process.env.USER_ADDRESS! as Address;

beforeAll(() => {
	const missing = Object.entries({ SUBGRAPH_URL, DIAMOND_CONTRACT_ADDRESS, RPC_URL, USER_ADDRESS })
		.filter(([, v]) => !v)
		.map(([k]) => k);
	if (missing.length > 0) {
		throw new Error(`Missing test env vars: ${missing.join(", ")}. Check test/.env.test`);
	}
});

// Mock localStorage
const storage = new Map<string, string>();
const localStorageMock = {
	getItem: vi.fn((key: string) => storage.get(key) ?? null),
	setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
	removeItem: vi.fn((key: string) => storage.delete(key)),
	clear: vi.fn(() => storage.clear()),
	get length() {
		return storage.size;
	},
	key: vi.fn((_index: number) => null),
};
vi.stubGlobal("localStorage", localStorageMock);

const publicClient = createPublicClient({
	chain: base,
	transport: http(RPC_URL),
});

const orderRouter = createOrderRouter({
	subgraphUrl: SUBGRAPH_URL,
	publicClient,
	contractAddress: DIAMOND_CONTRACT_ADDRESS,
});

const generator = createPayloadGenerator({ orderRouter });

describe("createPayloadGenerator — placeOrder (live)", () => {
	beforeEach(() => {
		storage.clear();
		vi.clearAllMocks();
	});

	it("builds a BUY order payload", async () => {
		const result = await generator.placeOrder({
			amount: parseUnits("10", 6),
			recipientAddr: USER_ADDRESS,
			orderType: 0,
			currency: "INR",
			fiatAmount: parseUnits("800", 6),
			user: USER_ADDRESS,
		});

		expect(result.isOk()).toBe(true);
		const payload = result._unsafeUnwrap();

		expect(payload.circleId).toBeTypeOf("bigint");
		expect(payload.circleId).toBeGreaterThan(0n);
		expect(payload.amount).toBe(parseUnits("10", 6));
		expect(payload.recipientAddr).toBe(USER_ADDRESS);
		expect(payload.orderType).toBe(0);
		expect(payload.currency).toBe("INR");
		const relayIdentity = getRelayIdentity()._unsafeUnwrap();
		expect(payload.pubKey).toBe(relayIdentity.publicKey);
		expect(payload.userPubKey).toBe("");
		expect(payload.preferredPaymentChannelConfigId).toBe(0n);
		expect(payload.fiatAmountLimit).toBe(0n);
	}, 30_000);

	it("builds a SELL order payload", async () => {
		const result = await generator.placeOrder({
			amount: parseUnits("10", 6),
			recipientAddr: USER_ADDRESS,
			orderType: 1,
			currency: "INR",
			fiatAmount: parseUnits("800", 6),
			user: USER_ADDRESS,
		});

		expect(result.isOk()).toBe(true);
		const payload = result._unsafeUnwrap();

		expect(payload.circleId).toBeTypeOf("bigint");
		expect(payload.circleId).toBeGreaterThan(0n);
		expect(payload.orderType).toBe(1);
		expect(payload.pubKey).toBe("");
		const relayIdentity = getRelayIdentity()._unsafeUnwrap();
		expect(payload.userPubKey).toBe(relayIdentity.publicKey);
		expect(payload.preferredPaymentChannelConfigId).toBe(0n);
		expect(payload.fiatAmountLimit).toBe(0n);
	}, 30_000);

	it("builds a PAY order payload", async () => {
		const result = await generator.placeOrder({
			amount: parseUnits("5", 6),
			recipientAddr: USER_ADDRESS,
			orderType: 2,
			currency: "INR",
			fiatAmount: parseUnits("400", 6),
			user: USER_ADDRESS,
		});

		expect(result.isOk()).toBe(true);
		const payload = result._unsafeUnwrap();

		expect(payload.circleId).toBeTypeOf("bigint");
		expect(payload.circleId).toBeGreaterThan(0n);
		expect(payload.orderType).toBe(2);
		expect(payload.pubKey).toBe("");
		const relayIdentity = getRelayIdentity()._unsafeUnwrap();
		expect(payload.userPubKey).toBe(relayIdentity.publicKey);
		expect(payload.preferredPaymentChannelConfigId).toBe(0n);
		expect(payload.fiatAmountLimit).toBe(0n);
	}, 30_000);

	it.each([
		{ orderType: 0, label: "BUY", expectPubKey: true },
		{ orderType: 1, label: "SELL", expectPubKey: false },
		{ orderType: 2, label: "PAY", expectPubKey: false },
	])("builds a $label order payload with all optional params", async ({ orderType, expectPubKey }) => {
		const result = await generator.placeOrder({
			amount: parseUnits("20", 6),
			recipientAddr: USER_ADDRESS,
			orderType,
			currency: "INR",
			fiatAmount: parseUnits("1600", 6),
			user: USER_ADDRESS,
			pubKey: "custom-public-key-value",
			preferredPaymentChannelConfigId: 5n,
			fiatAmountLimit: 1000n,
		});

		expect(result.isOk()).toBe(true);
		const payload = result._unsafeUnwrap();

		expect(payload.circleId).toBeTypeOf("bigint");
		expect(payload.circleId).toBeGreaterThan(0n);
		expect(payload.amount).toBe(parseUnits("20", 6));
		expect(payload.recipientAddr).toBe(USER_ADDRESS);
		expect(payload.orderType).toBe(orderType);
		expect(payload.currency).toBe("INR");
		expect(payload.pubKey).toBe(expectPubKey ? "custom-public-key-value" : "");
		expect(payload.userPubKey).toBe(expectPubKey ? "" : "custom-public-key-value");
		expect(payload.preferredPaymentChannelConfigId).toBe(5n);
		expect(payload.fiatAmountLimit).toBe(1000n);
	}, 30_000);
});

describe("createPayloadGenerator — setSellOrderUpi", () => {
	beforeEach(() => {
		storage.clear();
		vi.clearAllMocks();
	});

	it("encrypts seller UPI and returns payload that merchant can decrypt", async () => {
		// Simulate the merchant's relay identity — in production the merchant app
		// generates this keypair and shares the publicKey with the seller.
		const merchantIdentity = createRelayIdentity();

		// Seller encrypts their UPI address with the merchant's public key
		const result = await generator.setSellOrderUpi({
			orderId: 42,
			paymentAddress: "usdc_seller@upi",
			merchantPublicKey: merchantIdentity.publicKey,
			updatedAmount: parseUnits("500", 6),
		});

		expect(result.isOk()).toBe(true);
		const payload = result._unsafeUnwrap();

		expect(payload.orderId).toBe(42);
		expect(payload.updatedAmount).toBe(parseUnits("500", 6));
		expect(payload.userEncUpi).toBeTruthy();

		// Merchant decrypts the encrypted UPI using their private key
		const encryptedObj = cipherParse(payload.userEncUpi);
		const decResult = await decryptPaymentAddress(JSON.stringify(encryptedObj));
		expect(decResult.isOk()).toBe(true);
		const decrypted = JSON.parse(decResult._unsafeUnwrap());
		expect(decrypted.message).toBe("usdc_seller@upi");
	});

	it("returns VALIDATION_ERROR for empty paymentAddress", async () => {
		const identity = createRelayIdentity();

		const result = await generator.setSellOrderUpi({
			orderId: 1,
			paymentAddress: "",
			merchantPublicKey: identity.publicKey,
			updatedAmount: 100n,
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
	});

	it("returns VALIDATION_ERROR for empty merchantPublicKey", async () => {
		const result = await generator.setSellOrderUpi({
			orderId: 1,
			paymentAddress: "seller@upi",
			merchantPublicKey: "",
			updatedAmount: 100n,
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
	});
});
