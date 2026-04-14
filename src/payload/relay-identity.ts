import { ok, type Result } from "neverthrow";
import { isAddress, isHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { validate } from "../validation";
import { PayloadError } from "./errors";

export interface RelayIdentity {
	readonly address: string;
	readonly publicKey: string;
	readonly privateKey: string;
}

const ZodRelayIdentitySchema = z.object({
	address: z.string().refine(isAddress, { message: "Invalid relay identity address" }),
	publicKey: z.string().refine((val) => isHex(`0x${val}`), {
		message: "Invalid relay identity public key",
	}),
	privateKey: z.string().refine(isHex, { message: "Invalid relay identity private key" }),
});

const STORAGE_KEY = "@P2PME:RELAY_IDENTITY";

/**
 * Generates a new relay identity keypair via viem and persists it to localStorage.
 */
export function createRelayIdentity(): RelayIdentity {
	const privateKey = generatePrivateKey();
	const account = privateKeyToAccount(privateKey);

	// Match eth-crypto format: publicKey is 128 hex chars without 0x04 prefix
	const rawPubKey = account.publicKey; // 0x04 + 128 hex chars
	const publicKey = rawPubKey.slice(4); // strip 0x04

	const identity: RelayIdentity = {
		address: account.address,
		publicKey,
		privateKey,
	};

	localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));

	return identity;
}

/**
 * Retrieves the relay identity from localStorage, or creates a new one if absent/invalid.
 */
export function getRelayIdentity(): Result<RelayIdentity, PayloadError> {
	const data = localStorage.getItem(STORAGE_KEY);

	if (!data) {
		return ok(createRelayIdentity());
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(data);
	} catch {
		return ok(createRelayIdentity());
	}

	const result = validate(
		ZodRelayIdentitySchema,
		parsed,
		(message, cause, d) =>
			new PayloadError(message, { code: "VALIDATION_ERROR", cause, context: { data: d } }),
	);
	if (result.isErr()) {
		return ok(createRelayIdentity());
	}

	return result;
}
