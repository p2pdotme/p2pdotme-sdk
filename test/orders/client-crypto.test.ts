import { describe, expect, it } from "vitest";
import { createOrders } from "../../src/orders/client";
import { createInMemoryRelayStore, createRelayIdentity } from "../../src/orders/relay-identity";

const DIAMOND = "0x000000000000000000000000000000000000beef" as const;
const USDC = "0x000000000000000000000000000000000000aaaa" as const;

function makeOrders(seedIdentity = false) {
	const store = createInMemoryRelayStore();
	const orders = createOrders({
		publicClient: {} as never,
		diamondAddress: DIAMOND,
		usdcAddress: USDC,
		subgraphUrl: "https://example.invalid/subgraph",
		relayIdentityStore: store,
		relayIdentity: seedIdentity ? createRelayIdentity() : undefined,
	});
	return { orders, store };
}

describe("orders.encryptPaymentAddress / decryptPaymentAddress", () => {
	it("encrypts then decrypts a payment address using the resolved relay identity", async () => {
		const { orders } = makeOrders(true);
		const recipientIdentity = createRelayIdentity();

		const encrypted = await orders.encryptPaymentAddress({
			paymentAddress: "user@upi",
			recipientPublicKey: recipientIdentity.publicKey,
		});
		expect(encrypted.isOk()).toBe(true);

		// Build a second client whose store returns the recipient identity, so the
		// `decryptPaymentAddress` wrapper resolves to the matching private key.
		const recipientStore = createInMemoryRelayStore();
		await recipientStore.set(recipientIdentity);
		const recipientOrders = createOrders({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			usdcAddress: USDC,
			subgraphUrl: "https://example.invalid/subgraph",
			relayIdentityStore: recipientStore,
		});

		const decrypted = await recipientOrders.decryptPaymentAddress({
			encrypted: encrypted._unsafeUnwrap(),
		});
		expect(decrypted.isOk()).toBe(true);
		expect(decrypted._unsafeUnwrap()).toBe("user@upi");
	});

	it("auto-generates and persists a relay identity on first use when the store is empty", async () => {
		const { orders, store } = makeOrders(false);
		expect(await store.get()).toBeNull();

		const recipientIdentity = createRelayIdentity();
		const result = await orders.encryptPaymentAddress({
			paymentAddress: "user@upi",
			recipientPublicKey: recipientIdentity.publicKey,
		});
		expect(result.isOk()).toBe(true);

		const persisted = await store.get();
		expect(persisted).not.toBeNull();
		expect(persisted?.publicKey).toBeTypeOf("string");
	});

	it("surfaces ENCRYPTION_FAILED when ciphertext is malformed", async () => {
		const { orders } = makeOrders(true);
		const result = await orders.decryptPaymentAddress({ encrypted: "not-a-valid-cipher" });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("ENCRYPTION_FAILED");
	});
});
