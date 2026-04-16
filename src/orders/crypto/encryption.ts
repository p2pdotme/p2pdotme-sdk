import { ok, Result, ResultAsync, safeTry } from "neverthrow";
import { keccak256, serializeSignature, stringToHex } from "viem";
import { sign } from "viem/accounts";
import { z } from "zod";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import type { RelayIdentity } from "../relay-identity";
import {
	cipherParse,
	cipherStringify,
	decryptWithPrivateKey,
	type Encrypted,
	encryptWithPublicKey,
} from "./ecies";

export interface EncryptPaymentAddressInput {
	readonly paymentAddress: string;
	readonly recipientPublicKey: string;
	readonly senderIdentity: RelayIdentity;
}

/**
 * Signs `paymentAddress` with the sender relay identity's private key, then
 * ECIES-encrypts the `{ message, signature }` payload for the recipient. Returns
 * the hex-stringified ciphertext suitable for on-chain storage.
 */
export function encryptPaymentAddress(
	input: EncryptPaymentAddressInput,
): ResultAsync<string, OrdersError> {
	return safeTry<string, OrdersError>(async function* () {
		const messageHash = keccak256(stringToHex(input.paymentAddress));

		const signature = yield* ResultAsync.fromPromise(
			sign({ hash: messageHash, privateKey: input.senderIdentity.privateKey }),
			(cause) =>
				new OrdersError("Failed to sign payment address", {
					code: "ENCRYPTION_FAILED",
					cause,
				}),
		).map(serializeSignature);

		const payload = JSON.stringify({ message: input.paymentAddress, signature });

		const encrypted = yield* ResultAsync.fromPromise(
			encryptWithPublicKey(input.recipientPublicKey, payload),
			(cause) =>
				new OrdersError("ECIES encryption failed", {
					code: "ENCRYPTION_FAILED",
					cause,
				}),
		);

		const safeStringify = Result.fromThrowable(
			(e: Encrypted) => cipherStringify(e),
			(cause) =>
				new OrdersError("Ciphertext stringify failed", {
					code: "ENCRYPTION_FAILED",
					cause,
				}),
		);

		return ok(yield* safeStringify(encrypted));
	});
}

const ZodDecryptedPayloadSchema = z.object({
	message: z.string(),
	signature: z.string(),
});

export interface DecryptPaymentAddressInput {
	readonly encrypted: string;
	readonly recipientIdentity: RelayIdentity;
}

/**
 * Decrypts a ciphertext produced by `encryptPaymentAddress` using the recipient
 * relay identity's private key. Returns the plaintext payment address.
 */
export function decryptPaymentAddress(
	input: DecryptPaymentAddressInput,
): ResultAsync<string, OrdersError> {
	return safeTry<string, OrdersError>(async function* () {
		const safeCipherParse = Result.fromThrowable(
			(s: string) => cipherParse(s),
			(cause) =>
				new OrdersError("Failed to parse ciphertext", {
					code: "ENCRYPTION_FAILED",
					cause,
				}),
		);

		const encryptedData = yield* safeCipherParse(input.encrypted);

		const plaintext = yield* ResultAsync.fromPromise(
			decryptWithPrivateKey(input.recipientIdentity.privateKey, encryptedData),
			(cause) =>
				new OrdersError("ECIES decryption failed", {
					code: "ENCRYPTION_FAILED",
					cause,
				}),
		);

		const safeJsonParse = Result.fromThrowable(
			(s: string) => JSON.parse(s) as unknown,
			(cause) =>
				new OrdersError("Failed to parse decrypted payload JSON", {
					code: "ENCRYPTION_FAILED",
					cause,
				}),
		);

		const parsed = yield* safeJsonParse(plaintext);

		const payload = yield* validate(
			ZodDecryptedPayloadSchema,
			parsed,
			(message, cause, data) =>
				new OrdersError(message, {
					code: "ENCRYPTION_FAILED",
					cause,
					context: { data },
				}),
		);

		return ok(payload.message);
	});
}

export { cipherParse, cipherStringify } from "./ecies";
