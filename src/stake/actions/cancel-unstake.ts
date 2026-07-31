import { okAsync, type ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import type { StakeError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";

export interface CancelUnstakeAction {
	prepare(): ResultAsync<PreparedTx, StakeError>;
	execute(params: ExecuteBase): ResultAsync<TxResult, StakeError>;
}

export interface CreateCancelUnstakeInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

/**
 * Creates a cancelUnstake action that encodes `p2pBoostCancelUnstake()` in
 * `prepare` and submits it via the consumer's WalletClient in `execute`.
 * Returns the caller from COOLDOWN back to ACTIVE, restoring their boost
 * without any token movement.
 */
export function createCancelUnstakeAction(input: CreateCancelUnstakeInput): CancelUnstakeAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (): ResultAsync<PreparedTx, StakeError> =>
		okAsync<PreparedTx, StakeError>({
			to: diamondAddress,
			data: encodeFunctionData({
				abi: ABIS.FACETS.STAKE,
				functionName: "p2pBoostCancelUnstake",
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
