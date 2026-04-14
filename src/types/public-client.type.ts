import type { Address } from "viem";

/**
 * Minimal viem PublicClient interface — consumers pass their own client.
 * The SDK uses `readContract` for single reads and `multicall` where available
 * to batch multiple reads into one RPC round-trip.
 */
export interface PublicClientLike {
	readContract(args: {
		address: Address;
		abi: readonly unknown[];
		functionName: string;
		args: readonly unknown[];
	}): Promise<unknown>;
	multicall?(args: {
		contracts: readonly {
			address: Address;
			abi: readonly unknown[];
			functionName: string;
			args?: readonly unknown[];
		}[];
		allowFailure?: boolean;
	}): Promise<readonly unknown[]>;
}
