import type { ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData, erc20Abi } from "viem";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type ApproveUsdcParams, ZodApproveUsdcParamsSchema } from "../validation";

export interface ApproveUsdcAction {
	prepare(params: ApproveUsdcParams): ResultAsync<PreparedTx, OrdersError>;
	execute(params: ApproveUsdcParams & ExecuteBase): ResultAsync<TxResult, OrdersError>;
}

/**
 * Creates an approveUsdc action that encodes `IERC20.approve(diamond, amount)` targeting
 * the USDC contract in `prepare` and submits it via the consumer's WalletClient in `execute`.
 */
export function createApproveUsdcAction(input: {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
	readonly usdcAddress: Address;
}): ApproveUsdcAction {
	const { publicClient, diamondAddress, usdcAddress } = input;

	const prepareFn = (params: ApproveUsdcParams) =>
		validate(
			ZodApproveUsdcParamsSchema,
			params,
			(message, cause, data) =>
				new OrdersError(message, {
					code: "VALIDATION_ERROR",
					cause,
					context: { data },
				}),
		).map<PreparedTx>(({ amount }) => ({
			to: usdcAddress,
			data: encodeFunctionData({
				abi: erc20Abi,
				functionName: "approve",
				args: [diamondAddress, amount],
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
