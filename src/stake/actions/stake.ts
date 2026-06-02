import type { ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { StakeError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type StakeParams, ZodStakeParamsSchema } from "../validation";

export interface StakeAction {
	prepare(params: StakeParams): ResultAsync<PreparedTx, StakeError>;
	execute(params: StakeParams & ExecuteBase): ResultAsync<TxResult, StakeError>;
}

export interface CreateStakeInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

/**
 * Creates a stake action that encodes `p2pBoostStake(tokens)` in `prepare` and
 * submits it via the consumer's WalletClient in `execute`.
 */
export function createStakeAction(input: CreateStakeInput): StakeAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (params: StakeParams) =>
		validate(
			ZodStakeParamsSchema,
			params,
			(message, cause, data) =>
				new StakeError(message, {
					code: "VALIDATION_ERROR",
					cause,
					context: { data },
				}),
		).map<PreparedTx>(({ tokens }) => ({
			to: diamondAddress,
			data: encodeFunctionData({
				abi: ABIS.FACETS.STAKE,
				functionName: "p2pBoostStake",
				args: [tokens],
			}),
			value: 0n,
		}));

	return {
		prepare(params) {
			return prepareFn(params).asyncMap(async (tx) => tx);
		},
		execute({ walletClient, waitForReceipt, ...params }) {
			return prepareFn(params).asyncAndThen((prepared) =>
				submitPreparedTx({ prepared, walletClient, publicClient, waitForReceipt }),
			);
		},
	};
}
