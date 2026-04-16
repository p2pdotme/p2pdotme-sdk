import { errAsync, ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData, erc20Abi, parseEventLogs, stringToHex } from "viem";
import { ORDER_TYPE } from "../../constants";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { OrdersError } from "../errors";
import type { OrderRouter } from "../internal/routing/client";
import {
	type RelayIdentity,
	type RelayIdentityStore,
	resolveRelayIdentity,
} from "../relay-identity";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type PlaceOrderParams, ZodPlaceOrderParamsSchema } from "../validation";
import { readUsdcAllowance } from "./approve-usdc";

export interface PlaceOrderExecuteParams extends ExecuteBase {
	/**
	 * When true on a SELL/PAY order with insufficient USDC allowance, an approve
	 * tx is submitted and awaited before placeOrder. Defaults to false, in which
	 * case insufficient allowance surfaces `ALLOWANCE_INSUFFICIENT`.
	 */
	readonly autoApprove?: boolean;
}

export interface PlaceOrderAction {
	prepare(params: PlaceOrderParams): ResultAsync<PreparedTx, OrdersError>;
	execute(params: PlaceOrderParams & PlaceOrderExecuteParams): ResultAsync<TxResult, OrdersError>;
}

/**
 * If `result.receipt` is present, parse its logs for the OrderPlaced event
 * emitted by the user and return a new TxResult with `meta.orderId` populated.
 * Returns the original result unchanged if no receipt, no matching log, or a
 * decoding error — orderId is best-effort extra, never a failure mode.
 */
function enrichWithOrderId(result: TxResult, userAddress: Address): TxResult {
	if (!result.receipt) return result;
	try {
		const events = parseEventLogs({
			abi: ABIS.FACETS.ORDER_FLOW,
			eventName: "OrderPlaced",
			logs: result.receipt.logs,
		});
		const lowered = userAddress.toLowerCase();
		const mine = events.find((e) => (e.args.user as string | undefined)?.toLowerCase() === lowered);
		const chosen = mine ?? events[0];
		if (!chosen) return result;
		const orderId = chosen.args.orderId as bigint | undefined;
		if (orderId === undefined) return result;
		return { ...result, meta: { ...result.meta, orderId } };
	} catch {
		return result;
	}
}

/**
 * Creates a placeOrder action that selects a circle, resolves a relay identity,
 * and encodes the on-chain calldata in `prepare`; `execute` submits via the consumer's WalletClient.
 */
export function createPlaceOrderAction(input: {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
	readonly usdcAddress: Address;
	readonly orderRouter: OrderRouter;
	readonly relayIdentityStore: RelayIdentityStore;
	readonly relayIdentity?: RelayIdentity;
}): PlaceOrderAction {
	const { publicClient, diamondAddress, orderRouter, relayIdentityStore, relayIdentity } = input;

	const prepareFn = (params: PlaceOrderParams): ResultAsync<PreparedTx, OrdersError> =>
		validate(
			ZodPlaceOrderParamsSchema,
			params,
			(message, cause, data) =>
				new OrdersError(message, {
					code: "VALIDATION_ERROR",
					cause,
					context: { data },
				}),
		).asyncAndThen((v) => {
			const pcConfigId = v.preferredPaymentChannelConfigId ?? 0n;

			const circleResult = orderRouter
				.selectCircle({
					currency: v.currency,
					user: v.user,
					usdtAmount: v.amount,
					fiatAmount: v.fiatAmount,
					orderType: BigInt(v.orderType),
					preferredPCConfigId: pcConfigId,
				})
				.mapErr(
					(cause) =>
						new OrdersError(`Circle selection failed: ${cause.message}`, {
							code: "CIRCLE_SELECTION_FAILED",
							cause,
						}),
				);

			const identityResult = resolveRelayIdentity({
				relayIdentity,
				store: relayIdentityStore,
			});

			return ResultAsync.combine([circleResult, identityResult]).map(
				([circleId, senderIdentity]) => {
					const isBuy = v.orderType === ORDER_TYPE.BUY;
					const keyFromCaller = v.pubKey ?? senderIdentity.publicKey;
					const pubKey = isBuy ? keyFromCaller : "";
					const userPubKey = isBuy ? "" : keyFromCaller;

					const currencyBytes32 = stringToHex(v.currency, { size: 32 });

					const data = encodeFunctionData({
						abi: ABIS.FACETS.ORDER_FLOW,
						functionName: "placeOrder",
						args: [
							pubKey,
							v.amount,
							v.recipientAddr,
							v.orderType,
							"", // _userUpi — set later via setSellOrderUpi if applicable
							userPubKey,
							currencyBytes32,
							pcConfigId,
							circleId,
							v.fiatAmountLimit ?? 0n,
						],
					});

					return {
						to: diamondAddress,
						data,
						value: 0n,
						meta: { circleId, relayIdentity: senderIdentity },
					} satisfies PreparedTx;
				},
			);
		});

	return {
		prepare(params) {
			return prepareFn(params);
		},
		execute({ walletClient, waitForReceipt, autoApprove, ...params }) {
			const owner = walletClient.account?.address;
			const enrich = (r: TxResult): TxResult => (owner ? enrichWithOrderId(r, owner) : r);

			return prepareFn(params).andThen((prepared) => {
				const orderType = params.orderType;
				const isPull = orderType === 1 || orderType === 2; // SELL or PAY
				if (!isPull) {
					return submitPreparedTx({
						prepared,
						walletClient,
						publicClient,
						waitForReceipt,
					}).map(enrich);
				}

				if (!owner) {
					return submitPreparedTx({
						prepared,
						walletClient,
						publicClient,
						waitForReceipt,
					}).map(enrich);
				}

				return readUsdcAllowance({
					publicClient,
					usdcAddress: input.usdcAddress,
					diamondAddress: input.diamondAddress,
					params: { owner },
				}).andThen((allowance) => {
					if (allowance >= params.amount) {
						return submitPreparedTx({
							prepared,
							walletClient,
							publicClient,
							waitForReceipt,
						}).map(enrich);
					}
					if (!autoApprove) {
						return errAsync(
							new OrdersError("USDC allowance is insufficient", {
								code: "ALLOWANCE_INSUFFICIENT",
								context: {
									required: params.amount.toString(),
									current: allowance.toString(),
								},
							}),
						);
					}
					const approveTx: PreparedTx = {
						to: input.usdcAddress,
						data: encodeFunctionData({
							abi: erc20Abi,
							functionName: "approve",
							args: [input.diamondAddress, params.amount],
						}),
						value: 0n,
					};
					return submitPreparedTx({
						prepared: approveTx,
						walletClient,
						publicClient,
						waitForReceipt: true,
					}).andThen((approveResult) =>
						submitPreparedTx({
							prepared,
							walletClient,
							publicClient,
							waitForReceipt,
							extraMeta: { approveTxHash: approveResult.hash },
						}).map(enrich),
					);
				});
			});
		},
	};
}
