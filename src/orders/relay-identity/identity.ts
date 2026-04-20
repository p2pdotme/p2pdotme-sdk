import { isAddress, isHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { z } from "zod";

export interface RelayIdentity {
	readonly address: `0x${string}`;
	readonly publicKey: string;
	readonly privateKey: `0x${string}`;
}

export const ZodRelayIdentitySchema = z.object({
	address: z.string().refine(isAddress, { message: "Invalid relay identity address" }),
	publicKey: z.string().refine((v) => isHex(`0x${v}`), {
		message: "Invalid relay identity public key",
	}),
	privateKey: z.string().refine(isHex, { message: "Invalid relay identity private key" }),
});

/**
 * Generates a fresh relay identity keypair. Pure — no side effects.
 * Consumers decide how to persist the result via a `RelayIdentityStore`.
 */
export function createRelayIdentity(): RelayIdentity {
	const privateKey = generatePrivateKey();
	const account = privateKeyToAccount(privateKey);
	// viem returns 0x04-prefixed uncompressed pubkey; strip the prefix to match
	// the eth-crypto shape used by our ECIES layer.
	const publicKey = account.publicKey.slice(4);
	return {
		address: account.address,
		publicKey,
		privateKey,
	};
}
