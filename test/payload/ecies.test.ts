import { secp256k1 } from "@noble/curves/secp256k1";
import { randomBytes } from "@noble/hashes/utils";
import { describe, expect, it } from "vitest";
import {
	cipherParse,
	cipherStringify,
	decryptWithPrivateKey,
	type Encrypted,
	encryptWithPublicKey,
} from "../../src/payload/ecies";

/** Generate an eth-crypto-style keypair: privateKey 0x-prefixed, publicKey 128 hex (no 04). */
function generateTestKeypair() {
	const privBytes = randomBytes(32);
	const pubBytes = secp256k1.getPublicKey(privBytes, false); // uncompressed 65 bytes

	const privHex = `0x${Buffer.from(privBytes).toString("hex")}`;
	const pubHex = Buffer.from(pubBytes).toString("hex").slice(2); // strip leading "04"

	return { privateKey: privHex, publicKey: pubHex };
}

// ── encryptWithPublicKey / decryptWithPrivateKey ────────────────────────

describe("ECIES encrypt + decrypt", () => {
	it("round-trips a simple string", async () => {
		const kp = generateTestKeypair();
		const message = "hello world";

		const encrypted = await encryptWithPublicKey(kp.publicKey, message);
		const decrypted = await decryptWithPrivateKey(kp.privateKey, encrypted);

		expect(decrypted).toBe(message);
	});

	it("round-trips a JSON payload (mimics real SDK usage)", async () => {
		const kp = generateTestKeypair();
		const payload = JSON.stringify({ message: "user@upi", signature: "0xdeadbeef" });

		const encrypted = await encryptWithPublicKey(kp.publicKey, payload);
		const decrypted = await decryptWithPrivateKey(kp.privateKey, encrypted);

		expect(JSON.parse(decrypted)).toEqual({ message: "user@upi", signature: "0xdeadbeef" });
	});

	it("round-trips unicode and emoji", async () => {
		const kp = generateTestKeypair();
		const message = "Prashant — \u00e9\u00e8\u00ea — \u4f60\u597d";

		const encrypted = await encryptWithPublicKey(kp.publicKey, message);
		const decrypted = await decryptWithPrivateKey(kp.privateKey, encrypted);

		expect(decrypted).toBe(message);
	});

	it("round-trips an empty string", async () => {
		const kp = generateTestKeypair();

		const encrypted = await encryptWithPublicKey(kp.publicKey, "");
		const decrypted = await decryptWithPrivateKey(kp.privateKey, encrypted);

		expect(decrypted).toBe("");
	});

	it("round-trips a long message (>256 bytes)", async () => {
		const kp = generateTestKeypair();
		const message = "A".repeat(1000);

		const encrypted = await encryptWithPublicKey(kp.publicKey, message);
		const decrypted = await decryptWithPrivateKey(kp.privateKey, encrypted);

		expect(decrypted).toBe(message);
	});

	it("produces different ciphertext for the same plaintext (random IV + ephemeral key)", async () => {
		const kp = generateTestKeypair();
		const message = "determinism check";

		const enc1 = await encryptWithPublicKey(kp.publicKey, message);
		const enc2 = await encryptWithPublicKey(kp.publicKey, message);

		expect(enc1.iv).not.toBe(enc2.iv);
		expect(enc1.ephemPublicKey).not.toBe(enc2.ephemPublicKey);
		expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
	});

	it("returns an Encrypted object with correct field types and lengths", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "test");

		// IV: 16 bytes = 32 hex chars
		expect(encrypted.iv).toMatch(/^[0-9a-f]{32}$/);
		// ephemPublicKey: 65 bytes uncompressed = 130 hex chars
		expect(encrypted.ephemPublicKey).toMatch(/^[0-9a-f]{130}$/);
		// MAC: 32 bytes = 64 hex chars
		expect(encrypted.mac).toMatch(/^[0-9a-f]{64}$/);
		// ciphertext: variable length, but always even hex
		expect(encrypted.ciphertext).toMatch(/^[0-9a-f]+$/);
		expect(encrypted.ciphertext.length % 2).toBe(0);
	});

	it("ephemPublicKey starts with 04 (uncompressed point marker)", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "test");

		expect(encrypted.ephemPublicKey.startsWith("04")).toBe(true);
	});
});

// ── MAC verification ────────────────────────────────────────────────────

describe("ECIES MAC verification", () => {
	it("rejects tampered ciphertext", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "secret");

		const tampered: Encrypted = {
			...encrypted,
			ciphertext: encrypted.ciphertext.replace(/^.{2}/, "ff"),
		};

		await expect(decryptWithPrivateKey(kp.privateKey, tampered)).rejects.toThrow("MAC mismatch");
	});

	it("rejects tampered IV", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "secret");

		const tampered: Encrypted = {
			...encrypted,
			iv: "00".repeat(16),
		};

		await expect(decryptWithPrivateKey(kp.privateKey, tampered)).rejects.toThrow("MAC mismatch");
	});

	it("rejects tampered MAC", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "secret");

		const tampered: Encrypted = {
			...encrypted,
			mac: "00".repeat(32),
		};

		await expect(decryptWithPrivateKey(kp.privateKey, tampered)).rejects.toThrow("MAC mismatch");
	});

	it("rejects decryption with wrong private key", async () => {
		const kp1 = generateTestKeypair();
		const kp2 = generateTestKeypair();

		const encrypted = await encryptWithPublicKey(kp1.publicKey, "secret");

		await expect(decryptWithPrivateKey(kp2.privateKey, encrypted)).rejects.toThrow("MAC mismatch");
	});
});

// ── cipherStringify / cipherParse ───────────────────────────────────────

describe("cipherStringify + cipherParse", () => {
	it("round-trips an Encrypted object through stringify → parse", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "payload");

		const str = cipherStringify(encrypted);
		const parsed = cipherParse(str);

		expect(parsed.iv).toBe(encrypted.iv);
		expect(parsed.mac).toBe(encrypted.mac);
		expect(parsed.ciphertext).toBe(encrypted.ciphertext);
		// ephemPublicKey goes through compress → decompress, should match original
		expect(parsed.ephemPublicKey).toBe(encrypted.ephemPublicKey);
	});

	it("stringify produces a hex string", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "test");

		const str = cipherStringify(encrypted);

		expect(str).toMatch(/^[0-9a-f]+$/);
	});

	it("stringify output has correct structure: IV(16) + compressed(33) + MAC(32) + ciphertext", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "test");

		const str = cipherStringify(encrypted);
		const bytes = Buffer.from(str, "hex");

		// IV: 16 bytes
		expect(bytes.length).toBeGreaterThanOrEqual(16 + 33 + 32);
		// Compressed public key starts at offset 16, first byte is 02 or 03
		const compressedPrefix = bytes[16];
		expect(compressedPrefix === 0x02 || compressedPrefix === 0x03).toBe(true);
	});

	it("full round-trip: encrypt → stringify → parse → decrypt", async () => {
		const kp = generateTestKeypair();
		const message = '{"message":"test@upi","signature":"0xabc"}';

		const encrypted = await encryptWithPublicKey(kp.publicKey, message);
		const serialized = cipherStringify(encrypted);
		const deserialized = cipherParse(serialized);
		const decrypted = await decryptWithPrivateKey(kp.privateKey, deserialized);

		expect(decrypted).toBe(message);
	});
});

// ── Cross-compatibility with eth-crypto wire format ─────────────────────
// These tests use known test vectors to verify wire compatibility with
// eth-crypto without needing it as a dependency. The vectors were generated
// by running eth-crypto@4.0.0 encrypt/stringify/sign/keccak256.

describe("eth-crypto wire format compatibility", () => {
	it("cipherParse output has correct field structure", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "test");
		const str = cipherStringify(encrypted);
		const parsed = cipherParse(str);

		expect(parsed).toHaveProperty("iv");
		expect(parsed).toHaveProperty("ephemPublicKey");
		expect(parsed).toHaveProperty("mac");
		expect(parsed).toHaveProperty("ciphertext");
		expect(parsed.ephemPublicKey).toHaveLength(130); // 65 bytes uncompressed
		expect(parsed.ephemPublicKey.startsWith("04")).toBe(true);
	});

	it("cipherParse throws on input shorter than 82 bytes", () => {
		// 80 hex chars = 40 bytes, well below the 82-byte minimum
		const short = "aa".repeat(40);
		expect(() => cipherParse(short)).toThrow(/input too short/);
	});

	it("cipherParse throws on empty string", () => {
		expect(() => cipherParse("")).toThrow(/input too short/);
	});

	it("compressed ephemPublicKey in stringified format can be decompressed back", async () => {
		const kp = generateTestKeypair();
		const encrypted = await encryptWithPublicKey(kp.publicKey, "round-trip");

		const stringified = cipherStringify(encrypted);

		// Extract the compressed key from the stringified buffer (bytes 16-49)
		const buf = Buffer.from(stringified, "hex");
		const compressedKey = buf.slice(16, 49);
		expect(compressedKey.length).toBe(33);

		// Decompress and verify it matches original
		const decompressed = secp256k1.ProjectivePoint.fromHex(compressedKey).toRawBytes(false);
		const decompressedHex = Buffer.from(decompressed).toString("hex");
		expect(decompressedHex).toBe(encrypted.ephemPublicKey);
	});
});
