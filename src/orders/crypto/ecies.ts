/**
 * Lightweight ECIES encryption/decryption using @noble libraries (transitive deps of viem).
 * Replaces eth-crypto's encryptWithPublicKey/decryptWithPrivateKey/cipher.stringify/cipher.parse.
 *
 * ECIES scheme (must match eth-crypto for wire compatibility):
 *   1. Generate ephemeral secp256k1 keypair
 *   2. ECDH shared secret (x-coordinate only, 32 bytes)
 *   3. KDF: SHA-512(shared_secret) → first 32 bytes = AES key, last 32 bytes = MAC key
 *   4. Encrypt: AES-256-CBC with random 16-byte IV
 *   5. MAC: HMAC-SHA256(macKey, IV || ephemPublicKey || ciphertext)
 */
import { cbc } from "@noble/ciphers/aes";
import { secp256k1 } from "@noble/curves/secp256k1";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import { concatBytes, randomBytes } from "@noble/hashes/utils";

/** Minimum byte length: 16 (IV) + 33 (compressed pubkey) + 32 (MAC) + 1 (min ciphertext) = 82. */
const MIN_CIPHER_BYTES = 82;

export interface Encrypted {
	readonly iv: string;
	readonly ephemPublicKey: string;
	readonly ciphertext: string;
	readonly mac: string;
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
	let hex = "";
	for (const b of bytes) {
		hex += b.toString(16).padStart(2, "0");
	}
	return hex;
}

/**
 * Constant-time comparison to prevent timing side-channel attacks on MAC verification.
 * Safe to early-return on length mismatch here — both inputs are fixed-size HMAC-SHA256 digests (32 bytes).
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a[i] ^ b[i];
	}
	return diff === 0;
}

function deriveKeys(sharedSecret: Uint8Array): { encKey: Uint8Array; macKey: Uint8Array } {
	const hash = sha512(sharedSecret);
	return {
		encKey: hash.slice(0, 32),
		macKey: hash.slice(32),
	};
}

/** ECIES encrypt a UTF-8 message with a secp256k1 public key (128-char hex, no 0x04 prefix). */
export async function encryptWithPublicKey(publicKey: string, message: string): Promise<Encrypted> {
	// eth-crypto stores publicKey without the 04 prefix — add it back for noble
	const pubKeyBytes = hexToBytes(`04${publicKey}`);

	const ephemPrivKey = randomBytes(32);
	const ephemPubKey = secp256k1.getPublicKey(ephemPrivKey, false); // uncompressed (65 bytes)

	const sharedPoint = secp256k1.getSharedSecret(ephemPrivKey, pubKeyBytes, true); // x-only (33 bytes with prefix)
	const sharedSecret = sharedPoint.slice(1); // strip 0x02/0x03 prefix → 32 bytes
	const { encKey, macKey } = deriveKeys(sharedSecret);

	const iv = randomBytes(16);
	const plaintext = new TextEncoder().encode(message);
	const cipher = cbc(encKey, iv);
	const ciphertext = cipher.encrypt(plaintext);

	const macData = concatBytes(iv, ephemPubKey, ciphertext);
	const mac = hmac(sha256, macKey, macData);

	return {
		iv: bytesToHex(iv),
		ephemPublicKey: bytesToHex(ephemPubKey),
		ciphertext: bytesToHex(ciphertext),
		mac: bytesToHex(mac),
	};
}

/** ECIES decrypt using a secp256k1 private key (0x-prefixed hex). */
export async function decryptWithPrivateKey(
	privateKey: string,
	encrypted: Encrypted,
): Promise<string> {
	const privKeyBytes = hexToBytes(privateKey.replace(/^0x/, ""));
	const ephemPubKeyBytes = hexToBytes(encrypted.ephemPublicKey);
	const ivBytes = hexToBytes(encrypted.iv);
	const ciphertextBytes = hexToBytes(encrypted.ciphertext);
	const macBytes = hexToBytes(encrypted.mac);

	const sharedPoint = secp256k1.getSharedSecret(privKeyBytes, ephemPubKeyBytes, true);
	const sharedSecret = sharedPoint.slice(1);
	const { encKey, macKey } = deriveKeys(sharedSecret);

	// Verify MAC before decrypting (constant-time to prevent timing oracle)
	const macData = concatBytes(ivBytes, ephemPubKeyBytes, ciphertextBytes);
	const computedMac = hmac(sha256, macKey, macData);
	if (!timingSafeEqual(computedMac, macBytes)) {
		throw new Error("MAC mismatch — ciphertext may be corrupted or tampered with");
	}

	const cipher = cbc(encKey, ivBytes);
	const plaintext = cipher.decrypt(ciphertextBytes);

	return new TextDecoder().decode(plaintext);
}

/**
 * Serializes an Encrypted object to a compact hex string.
 * Format: IV (16 bytes) || compressed ephemPublicKey (33 bytes) || MAC (32 bytes) || ciphertext.
 */
export function cipherStringify(encrypted: Encrypted): string {
	const ephemPubKeyBytes = hexToBytes(encrypted.ephemPublicKey);
	// Compress the uncompressed public key (65 → 33 bytes)
	const compressed = secp256k1.ProjectivePoint.fromHex(ephemPubKeyBytes).toRawBytes(true);

	const iv = hexToBytes(encrypted.iv);
	const mac = hexToBytes(encrypted.mac);
	const ciphertext = hexToBytes(encrypted.ciphertext);

	return bytesToHex(concatBytes(iv, compressed, mac, ciphertext));
}

/**
 * Parses a compact hex string back into an Encrypted object.
 * Inverse of cipherStringify.
 */
export function cipherParse(str: string): Encrypted {
	const buf = hexToBytes(str);

	if (buf.length < MIN_CIPHER_BYTES) {
		throw new Error(
			`cipherParse: input too short (${buf.length} bytes, need at least ${MIN_CIPHER_BYTES})`,
		);
	}

	const iv = buf.slice(0, 16);
	const compressed = buf.slice(16, 49);
	const mac = buf.slice(49, 81);
	const ciphertext = buf.slice(81);

	// Decompress back to uncompressed (33 → 65 bytes)
	const ephemPubKey = secp256k1.ProjectivePoint.fromHex(compressed).toRawBytes(false);

	return {
		iv: bytesToHex(iv),
		ephemPublicKey: bytesToHex(ephemPubKey),
		ciphertext: bytesToHex(ciphertext),
		mac: bytesToHex(mac),
	};
}
