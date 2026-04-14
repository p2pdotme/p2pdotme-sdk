import { ok, Result, ResultAsync, safeTry } from "neverthrow";
import { keccak256, serializeSignature, stringToHex } from "viem";
import { sign } from "viem/accounts";
import { z } from "zod";
import { validate } from "../validation";
import {
	cipherParse,
	cipherStringify,
	decryptWithPrivateKey,
	type Encrypted,
	encryptWithPublicKey,
} from "./ecies";
import { PayloadError } from "./errors";
import { getRelayIdentity } from "./relay-identity";

/**
 * Signs and encrypts a payment address using the relay identity's private key
 * and the recipient's public key, producing a hex-encoded ECIES ciphertext.
 */
export function encryptPaymentAddress(
	paymentAddress: string,
	encryptionPublicKey: string,
): ResultAsync<string, PayloadError> {
	return safeTry<string, PayloadError>(async function* () {
		const relayIdentity = yield* getRelayIdentity().mapErr(
			(e) =>
				new PayloadError(`Relay identity error: ${e.message}`, {
					code: "ENCRYPTION_ERROR",
					cause: e,
				}),
		);

		const messageHash = keccak256(stringToHex(paymentAddress));

		const signResult = yield* ResultAsync.fromPromise(
			sign({ hash: messageHash, privateKey: relayIdentity.privateKey as `0x${string}` }),
			(error) =>
				new PayloadError(
					`Signing error: ${error instanceof Error ? error.message : "Unknown error"}`,
					{ code: "ENCRYPTION_ERROR", cause: error },
				),
		);

		const signature = serializeSignature(signResult);

		const payload = { message: paymentAddress, signature };

		const encrypted = yield* ResultAsync.fromPromise(
			encryptWithPublicKey(encryptionPublicKey, JSON.stringify(payload)),
			(error) =>
				new PayloadError(
					`Encryption error: ${error instanceof Error ? error.message : "Unknown error"}`,
					{ code: "ENCRYPTION_ERROR", cause: error },
				),
		);

		const safeCipherStringify = Result.fromThrowable(
			(encryptedData: Encrypted) => cipherStringify(encryptedData),
			(error) =>
				new PayloadError(
					`Stringify error: ${error instanceof Error ? error.message : "Unknown error"}`,
					{ code: "ENCRYPTION_ERROR", cause: error },
				),
		);

		const stringified = yield* safeCipherStringify(encrypted);

		return ok(stringified);
	});
}

const ZodEncryptedDataSchema = z.object({
	ciphertext: z.string(),
	iv: z.string(),
	mac: z.string(),
	ephemPublicKey: z.string(),
});

/**
 * Decrypts an encrypted payment address using the relay identity's private key.
 */
export function decryptPaymentAddress(
	encryptedPaymentAddress: string,
): ResultAsync<string, PayloadError> {
	return safeTry<string, PayloadError>(async function* () {
		const relayIdentity = yield* getRelayIdentity().mapErr(
			(e) =>
				new PayloadError(`Relay identity error: ${e.message}`, {
					code: "DECRYPTION_ERROR",
					cause: e,
				}),
		);

		const safeJsonParse = Result.fromThrowable(
			(str: string) => JSON.parse(str) as unknown,
			(error) =>
				new PayloadError(
					`JSON parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
					{ code: "DECRYPTION_ERROR", cause: error },
				),
		);

		const parsed = yield* safeJsonParse(encryptedPaymentAddress);

		const encryptedData = yield* validate(
			ZodEncryptedDataSchema,
			parsed,
			(message, cause, data) =>
				new PayloadError(message, { code: "DECRYPTION_ERROR", cause, context: { data } }),
		);

		const decrypted = yield* ResultAsync.fromPromise(
			decryptWithPrivateKey(relayIdentity.privateKey, encryptedData as Encrypted),
			(error) =>
				new PayloadError(
					`Decryption error: ${error instanceof Error ? error.message : "Unknown error"}`,
					{ code: "DECRYPTION_ERROR", cause: error },
				),
		);

		return ok(decrypted);
	});
}
