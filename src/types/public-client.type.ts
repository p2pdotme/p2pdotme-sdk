import type { Address } from "viem";

/**
 * Minimal viem PublicClient interface — consumers pass their own client.
 * The SDK only needs `readContract` for on-chain reads.
 */
export interface PublicClientLike {
	readContract(args: {
		address: Address;
		abi: readonly unknown[];
		functionName: string;
		args: readonly unknown[];
	}): Promise<unknown>;
}
