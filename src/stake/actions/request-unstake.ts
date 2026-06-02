import { okAsync, type ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { StakeError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";

export interface RequestUnstakeAction {
	prepare(): ResultAsync<PreparedTx, StakeError>;
	execute(params: ExecuteBase): ResultAsync<TxResult, StakeError>;
}

export interface CreateRequestUnstakeInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

/**
 * Creates a requestUnstake action that encodes `p2pBoostRequestUnstake()` in
 * `prepare` and submits it via the consumer's WalletClient in `execute`.
 * Starts the unstake cooldown for the caller's active stake.
 */
export function createRequestUnstakeAction(
	input: CreateRequestUnstakeInput,
): RequestUnstakeAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (): ResultAsync<PreparedTx, StakeError> =>
		okAsync<PreparedTx, StakeError>({
			to: diamondAddress,
			data: encodeFunctionData({
				abi: ABIS.FACETS.STAKE,
				functionName: "p2pBoostRequestUnstake",
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
