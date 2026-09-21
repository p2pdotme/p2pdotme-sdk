import { describe, expect, it, vi } from "vitest";
import { decodeFunctionData } from "viem";
import { ABIS } from "../../../src/contracts/abis";
import { createSetSellOrderUpiWithFiatAction } from "../../../src/orders/actions/set-sell-order-upi-with-fiat";
import {
	createInMemoryRelayStore,
	createRelayIdentity,
} from "../../../src/orders/relay-identity";
import { decryptPaymentAddress } from "../../../src/orders/crypto/encryption";

const DIAMOND = "0x000000000000000000000000000000000000beef" as const;

describe("setSellOrderUpiWithFiat.prepare", () => {
	it("encrypts paymentAddress and encodes setSellOrderUpiWithFiat(orderId, userEncUpi, updatedFiatAmount)", async () => {
		const merchant = createRelayIdentity();
		const store = createInMemoryRelayStore();
		const action = createSetSellOrderUpiWithFiatAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			relayIdentityStore: store,
		});

		const result = await action.prepare({
			orderId: 3n,
			paymentAddress: "user@upi",
			merchantPublicKey: merchant.publicKey,
			updatedFiatAmount: 420_000_000n, // ₹420.00 (6-dec scaled)
		});
		expect(result.isOk()).toBe(true);

		const decoded = decodeFunctionData({
			abi: ABIS.FACETS.ORDER_FLOW,
			data: result._unsafeUnwrap().data,
		});
		expect(decoded.functionName).toBe("setSellOrderUpiWithFiat");
		const [orderId, userEncUpi, updatedFiatAmount] = decoded.args;
		expect(orderId).toBe(3n);
		expect(updatedFiatAmount).toBe(420_000_000n);
		expect(typeof userEncUpi).toBe("string");

		// Verify the encrypted payload round-trips with the merchant's key
		const decrypted = await decryptPaymentAddress({
			encrypted: userEncUpi as string,
			recipientIdentity: merchant,
		});
		expect(decrypted._unsafeUnwrap()).toBe("user@upi");
	});

	it("rejects a negative updatedFiatAmount", async () => {
		const merchant = createRelayIdentity();
		const action = createSetSellOrderUpiWithFiatAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			relayIdentityStore: createInMemoryRelayStore(),
		});

		const result = await action.prepare({
			orderId: 3n,
			paymentAddress: "user@upi",
			merchantPublicKey: merchant.publicKey,
			updatedFiatAmount: -1n,
		});
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
	});
});

describe("setSellOrderUpiWithFiat.execute", () => {
	it("submits the prepared tx", async () => {
		const merchant = createRelayIdentity();
		const sendTransaction = vi.fn().mockResolvedValue("0xhash");
		const walletClient = {
			account: { address: "0x0000000000000000000000000000000000000001" },
			chain: undefined,
			sendTransaction,
		} as never;
		const action = createSetSellOrderUpiWithFiatAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			relayIdentityStore: createInMemoryRelayStore(),
		});

		const result = await action.execute({
			walletClient,
			orderId: 3n,
			paymentAddress: "user@upi",
			merchantPublicKey: merchant.publicKey,
			updatedFiatAmount: 0n,
		});
		expect(result.isOk()).toBe(true);
		expect(sendTransaction).toHaveBeenCalledOnce();
	});
});
