import type { ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { StakeError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type TopUpParams, ZodTopUpParamsSchema } from "../validation";

export interface TopUpAction {
	prepare(params: TopUpParams): ResultAsync<PreparedTx, StakeError>;
	execute(params: TopUpParams & ExecuteBase): ResultAsync<TxResult, StakeError>;
}

export interface CreateTopUpInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

/**
 * Creates a topUp action that encodes `p2pBoostTopUp(tokens)` in `prepare` and
 * submits it via the consumer's WalletClient in `execute`.
 */
export function createTopUpAction(input: CreateTopUpInput): TopUpAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (params: TopUpParams) =>
		validate(
			ZodTopUpParamsSchema,
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
				functionName: "p2pBoostTopUp",
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
