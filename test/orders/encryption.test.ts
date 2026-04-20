import { describe, expect, it } from "vitest";
import {
	decryptPaymentAddress,
	encryptPaymentAddress,
} from "../../src/orders/crypto/encryption";
import { createRelayIdentity } from "../../src/orders/relay-identity";

describe("encryptPaymentAddress / decryptPaymentAddress", () => {
	it("round-trips through the recipient's key", async () => {
		const sender = createRelayIdentity();
		const recipient = createRelayIdentity();

		const encrypted = await encryptPaymentAddress({
			paymentAddress: "user@upi",
			recipientPublicKey: recipient.publicKey,
			senderIdentity: sender,
		});
		expect(encrypted.isOk()).toBe(true);

		const decrypted = await decryptPaymentAddress({
			encrypted: encrypted._unsafeUnwrap(),
			recipientIdentity: recipient,
		});
		expect(decrypted.isOk()).toBe(true);
		expect(decrypted._unsafeUnwrap()).toBe("user@upi");
	});

	it("surfaces ENCRYPTION_FAILED when recipient key is malformed", async () => {
		const sender = createRelayIdentity();
		const result = await encryptPaymentAddress({
			paymentAddress: "user@upi",
			recipientPublicKey: "not-a-key",
			senderIdentity: sender,
		});
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("ENCRYPTION_FAILED");
	});
});
