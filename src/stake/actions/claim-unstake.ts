import { okAsync, type ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { StakeError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";

export interface ClaimUnstakeAction {
	prepare(): ResultAsync<PreparedTx, StakeError>;
	execute(params: ExecuteBase): ResultAsync<TxResult, StakeError>;
}

export interface CreateClaimUnstakeInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

/**
 * Creates a claimUnstake action that encodes `p2pBoostClaimUnstake()` in
 * `prepare` and submits it via the consumer's WalletClient in `execute`.
 * Claimable only after the cooldown period has elapsed.
 */
export function createClaimUnstakeAction(input: CreateClaimUnstakeInput): ClaimUnstakeAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (): ResultAsync<PreparedTx, StakeError> =>
		okAsync<PreparedTx, StakeError>({
			to: diamondAddress,
			data: encodeFunctionData({
				abi: ABIS.FACETS.STAKE,
				functionName: "p2pBoostClaimUnstake",
				args: [],
			}),
			value: 0n,
		});

	return {
		prepare() {
			return prepareFn();
		},
		execute({ walletClient, waitForReceipt }) {
			return prepareFn().andThen((prepared) =>
				submitPreparedTx({ prepared, walletClient, publicClient, waitForReceipt }),
			);
		},
	};
}
