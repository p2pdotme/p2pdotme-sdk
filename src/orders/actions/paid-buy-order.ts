import type { ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type PaidBuyOrderParams, ZodPaidBuyOrderParamsSchema } from "../validation";

export interface PaidBuyOrderAction {
	prepare(params: PaidBuyOrderParams): ResultAsync<PreparedTx, OrdersError>;
	execute(params: PaidBuyOrderParams & ExecuteBase): ResultAsync<TxResult, OrdersError>;
}

export interface CreatePaidBuyOrderInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

/**
 * Creates a paidBuyOrder action that encodes the on-chain call in `prepare`
 * and submits it via the consumer's WalletClient in `execute`. Called by the
 * buyer to mark that fiat has been sent off-chain.
 */
export function createPaidBuyOrderAction(input: CreatePaidBuyOrderInput): PaidBuyOrderAction {
	const { publicClient, diamondAddress } = input;

	const prepareFn = (params: PaidBuyOrderParams) =>
		validate(
			ZodPaidBuyOrderParamsSchema,
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
				abi: ABIS.FACETS.ORDER_PROCESSOR,
				functionName: "paidBuyOrder",
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
