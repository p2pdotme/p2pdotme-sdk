import type { ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type RaiseDisputeParams, ZodRaiseDisputeParamsSchema } from "../validation";

export interface RaiseDisputeAction {
	prepare(params: RaiseDisputeParams): ResultAsync<PreparedTx, OrdersError>;
	execute(params: RaiseDisputeParams & ExecuteBase): ResultAsync<TxResult, OrdersError>;
}

/**
 * Creates a raiseDispute action that encodes the on-chain call in `prepare` and
 * submits it via the consumer's WalletClient in `execute`.
 */
export function createRaiseDisputeAction(input: {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}): RaiseDisputeAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (params: RaiseDisputeParams) =>
		validate(
			ZodRaiseDisputeParamsSchema,
			params,
			(message, cause, data) =>
				new OrdersError(message, {
					code: "VALIDATION_ERROR",
					cause,
					context: { data },
				}),
		).map<PreparedTx>(({ orderId, redactTransId }) => ({
			to: diamondAddress,
			data: encodeFunctionData({
				abi: ABIS.FACETS.ORDER_PROCESSOR,
				functionName: "raiseDispute",
				args: [orderId, redactTransId],
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
