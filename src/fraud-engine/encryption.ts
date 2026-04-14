import { bytesToBase64, hexToBytes } from "../lib/encoding";
import { FraudEngineError } from "./errors";

export async function getEncryptionKey(encryptionKeyHex: string): Promise<CryptoKey> {
	const keyBytes = hexToBytes(encryptionKeyHex);
	return crypto.subtle.importKey(
		"raw",
		keyBytes.buffer as ArrayBuffer,
		{ name: "AES-GCM" },
		false,
		["encrypt"],
	);
}

export async function encryptPayload(
	payload: string,
	aad: string,
	encryptionKeyHex: string,
): Promise<string> {
	try {
		const key = await getEncryptionKey(encryptionKeyHex);
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const encoded = new TextEncoder().encode(payload);
		const aadEncoded = new TextEncoder().encode(aad);

		const ciphertext = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv, additionalData: aadEncoded, tagLength: 128 },
			key,
			encoded,
		);

		// IV (12 bytes) + ciphertext + auth tag (16 bytes appended by Web Crypto)
		const result = new Uint8Array(iv.length + ciphertext.byteLength);
		result.set(iv, 0);
		result.set(new Uint8Array(ciphertext), iv.length);

		return bytesToBase64(result);
	} catch (cause) {
		throw new FraudEngineError("Encryption failed", {
			code: "ENCRYPTION_ERROR",
			cause,
		});
	}
}
