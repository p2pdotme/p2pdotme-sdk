import { beforeEach, describe, expect, it, vi } from "vitest";
import { keccak256, serializeSignature, stringToHex } from "viem";
import { sign } from "viem/accounts";
import {
	decryptPaymentAddress,
	encryptPaymentAddress,
} from "../../src/payload/crypto";
import {
	cipherParse,
	decryptWithPrivateKey,
	encryptWithPublicKey,
} from "../../src/payload/ecies";
import { createRelayIdentity, getRelayIdentity } from "../../src/payload/relay-identity";

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

// ── encryptPaymentAddress + decryptPaymentAddress ───────────────────────

describe("encryptPaymentAddress + decryptPaymentAddress", () => {
	beforeEach(() => {
		storage.clear();
		vi.clearAllMocks();
	});

	it("encrypt + decrypt round-trips a UPI address", async () => {
		const identity = createRelayIdentity();

		const encrypted = await encryptPaymentAddress("user@upi", identity.publicKey);
		expect(encrypted.isOk()).toBe(true);

		const encryptedHex = encrypted._unsafeUnwrap();
		const encryptedObject = cipherParse(encryptedHex);
		const jsonString = JSON.stringify(encryptedObject);

		const decrypted = await decryptPaymentAddress(jsonString);
		expect(decrypted.isOk()).toBe(true);

		const decryptedJson = JSON.parse(decrypted._unsafeUnwrap());
		expect(decryptedJson.message).toBe("user@upi");
		expect(decryptedJson.signature).toBeTruthy();
	});

	it("decrypted payload contains a valid secp256k1 signature", async () => {
		const identity = createRelayIdentity();

		const encrypted = await encryptPaymentAddress("test@upi", identity.publicKey);
		const encryptedObject = cipherParse(encrypted._unsafeUnwrap());
		const decrypted = await decryptPaymentAddress(JSON.stringify(encryptedObject));

		const payload = JSON.parse(decrypted._unsafeUnwrap());

		// Signature should be 0x-prefixed, 132 chars (r + s + v)
		expect(payload.signature).toMatch(/^0x[0-9a-f]{130}$/);
	});

	it("signature in payload matches signing the message hash with the relay key", async () => {
		const identity = createRelayIdentity();
		const paymentAddress = "verify@upi";

		const encrypted = await encryptPaymentAddress(paymentAddress, identity.publicKey);
		const encryptedObject = cipherParse(encrypted._unsafeUnwrap());
		const decrypted = await decryptPaymentAddress(JSON.stringify(encryptedObject));
		const payload = JSON.parse(decrypted._unsafeUnwrap());

		// Re-derive the expected signature
		const messageHash = keccak256(stringToHex(paymentAddress));
		const expectedSig = serializeSignature(
			await sign({ hash: messageHash, privateKey: identity.privateKey as `0x${string}` }),
		);

		expect(payload.signature).toBe(expectedSig);
	});

	it("returns DECRYPTION_ERROR for invalid JSON string input", async () => {
		createRelayIdentity();

		const result = await decryptPaymentAddress("not-json-string");

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.code).toBe("DECRYPTION_ERROR");
	});

	it("returns DECRYPTION_ERROR for JSON missing required fields", async () => {
		createRelayIdentity();

		const result = await decryptPaymentAddress(JSON.stringify({ iv: "aa", ciphertext: "bb" }));

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("DECRYPTION_ERROR");
	});

	it("returns DECRYPTION_ERROR for corrupted ciphertext", async () => {
		const identity = createRelayIdentity();

		const encrypted = await encryptPaymentAddress("user@upi", identity.publicKey);
		const encryptedObject = cipherParse(encrypted._unsafeUnwrap());

		// Corrupt the ciphertext
		const corrupted = {
			...encryptedObject,
			ciphertext: "ff".repeat(encryptedObject.ciphertext.length / 2),
		};

		const result = await decryptPaymentAddress(JSON.stringify(corrupted));
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("DECRYPTION_ERROR");
	});

	it("different recipients get different ciphertext for the same address", async () => {
		const id1 = createRelayIdentity();
		storage.clear(); // force new identity
		const id2 = createRelayIdentity();

		// Reset to id1 for encryption
		storage.clear();
		storage.set("@P2PME:RELAY_IDENTITY", JSON.stringify(id1));

		const enc1 = await encryptPaymentAddress("same@upi", id1.publicKey);
		const enc2 = await encryptPaymentAddress("same@upi", id2.publicKey);

		expect(enc1._unsafeUnwrap()).not.toBe(enc2._unsafeUnwrap());
	});
});

// ── Cross-recipient encrypt/decrypt (seller → merchant flow) ────────────

describe("cross-recipient encrypt/decrypt", () => {
	beforeEach(() => {
		storage.clear();
		vi.clearAllMocks();
	});

	it("seller encrypts UPI, merchant decrypts with their private key", async () => {
		// Merchant creates their identity
		const merchantIdentity = createRelayIdentity();
		storage.clear();

		// Seller creates their own identity (different keypair)
		createRelayIdentity();

		// Seller encrypts their UPI with merchant's public key
		const encrypted = await encryptPaymentAddress("seller@upi", merchantIdentity.publicKey);
		expect(encrypted.isOk()).toBe(true);

		// Merchant decrypts using cipherParse → decryptWithPrivateKey
		const encryptedObject = cipherParse(encrypted._unsafeUnwrap());
		const decrypted = await decryptWithPrivateKey(merchantIdentity.privateKey, encryptedObject);
		const payload = JSON.parse(decrypted);

		expect(payload.message).toBe("seller@upi");
		expect(payload.signature).toBeTruthy();
	});
});

// ── ECIES low-level cross-compatibility with relay identity ─────────────

describe("ECIES integration with relay identity", () => {
	beforeEach(() => {
		storage.clear();
		vi.clearAllMocks();
	});

	it("relay identity publicKey format is compatible with encryptWithPublicKey", async () => {
		const identity = createRelayIdentity();

		// publicKey should be 128 hex chars (64 bytes, no 04 prefix)
		expect(identity.publicKey).toHaveLength(128);
		expect(identity.publicKey).toMatch(/^[0-9a-f]{128}$/);

		// Should encrypt without error
		const encrypted = await encryptWithPublicKey(identity.publicKey, "test");
		expect(encrypted.iv).toBeDefined();
	});

	it("relay identity privateKey format is compatible with decryptWithPrivateKey", async () => {
		const identity = createRelayIdentity();

		// privateKey should be 0x-prefixed, 66 chars total
		expect(identity.privateKey).toMatch(/^0x[0-9a-f]{64}$/);

		const encrypted = await encryptWithPublicKey(identity.publicKey, "test");
		const decrypted = await decryptWithPrivateKey(identity.privateKey, encrypted);
		expect(decrypted).toBe("test");
	});

	it("getRelayIdentity returns an existing identity from localStorage", () => {
		const created = createRelayIdentity();
		const retrieved = getRelayIdentity();

		expect(retrieved.isOk()).toBe(true);
		expect(retrieved._unsafeUnwrap().privateKey).toBe(created.privateKey);
		expect(retrieved._unsafeUnwrap().publicKey).toBe(created.publicKey);
		expect(retrieved._unsafeUnwrap().address).toBe(created.address);
	});

	it("getRelayIdentity creates a new identity if localStorage is empty", () => {
		const result = getRelayIdentity();

		expect(result.isOk()).toBe(true);
		const identity = result._unsafeUnwrap();
		expect(identity.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
		expect(identity.publicKey).toHaveLength(128);
		expect(identity.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
	});

	it("getRelayIdentity regenerates if localStorage has invalid data", () => {
		storage.set("@P2PME:RELAY_IDENTITY", "not-valid-json");

		const result = getRelayIdentity();
		expect(result.isOk()).toBe(true);
		// Should have created a fresh identity
		expect(result._unsafeUnwrap().privateKey).toMatch(/^0x[0-9a-f]{64}$/);
	});
});

// ── Full pipeline: encrypt → stringify → parse → decrypt ────────────────

describe("full pipeline: encryptPaymentAddress → cipherParse → decryptWithPrivateKey", () => {
	beforeEach(() => {
		storage.clear();
		vi.clearAllMocks();
	});

	it("end-to-end with multiple payment addresses", async () => {
		const identity = createRelayIdentity();
		const addresses = ["user@upi", "1234567890@ybl", "name.surname@paytm", "a"];

		for (const addr of addresses) {
			const encrypted = await encryptPaymentAddress(addr, identity.publicKey);
			expect(encrypted.isOk()).toBe(true);

			const parsed = cipherParse(encrypted._unsafeUnwrap());
			const decrypted = await decryptWithPrivateKey(identity.privateKey, parsed);
			const payload = JSON.parse(decrypted);

			expect(payload.message).toBe(addr);
		}
	});

	it("stringified output is a pure hex string with no separators", async () => {
		const identity = createRelayIdentity();

		const encrypted = await encryptPaymentAddress("test@upi", identity.publicKey);
		const hex = encrypted._unsafeUnwrap();

		expect(hex).toMatch(/^[0-9a-f]+$/);
		// Minimum: IV(32) + compressed(66) + MAC(64) + ciphertext(32+) = 194+
		expect(hex.length).toBeGreaterThanOrEqual(194);
	});
});
