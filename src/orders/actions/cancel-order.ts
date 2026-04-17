import type { ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type CancelOrderParams, ZodCancelOrderParamsSchema } from "../validation";

export interface CancelOrderAction {
	prepare(params: CancelOrderParams): ResultAsync<PreparedTx, OrdersError>;
	execute(params: CancelOrderParams & ExecuteBase): ResultAsync<TxResult, OrdersError>;
}

export interface CreateCancelOrderInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

/**
 * Creates a cancelOrder action that encodes the on-chain call in `prepare` and
 * submits it via the consumer's WalletClient in `execute`.
 */
export function createCancelOrderAction(input: CreateCancelOrderInput): CancelOrderAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (params: CancelOrderParams) =>
		validate(
			ZodCancelOrderParamsSchema,
			params,
			(message, cause, data) =>
				new OrdersError(message, {
					code: "VALIDATION_ERROR",
					cause,
					context: { data },
				}),
		).map<PreparedTx>(({ orderId }) => ({
			to: diamondAddress,
			data: encodeFunctionData({
				abi: ABIS.FACETS.ORDER_FLOW,
				functionName: "cancelOrder",
				args: [orderId],
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
