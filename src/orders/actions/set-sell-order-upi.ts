import type { ResultAsync } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { ABIS } from "../../contracts/abis";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { encryptPaymentAddress } from "../crypto/encryption";
import { OrdersError } from "../errors";
import {
	type RelayIdentity,
	type RelayIdentityStore,
	resolveRelayIdentity,
} from "../relay-identity";
import { submitPreparedTx } from "../tx";
import type { ExecuteBase, PreparedTx, TxResult } from "../types";
import { type SetSellOrderUpiParams, ZodSetSellOrderUpiParamsSchema } from "../validation";

export interface SetSellOrderUpiAction {
	prepare(params: SetSellOrderUpiParams): ResultAsync<PreparedTx, OrdersError>;
	execute(params: SetSellOrderUpiParams & ExecuteBase): ResultAsync<TxResult, OrdersError>;
}

/**
 * Creates a setSellOrderUpi action that ECIES-encrypts the payment address for
 * the merchant, encodes the on-chain call in `prepare`, and submits it via the
 * consumer's WalletClient in `execute`.
 */
export function createSetSellOrderUpiAction(input: {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
	readonly relayIdentityStore: RelayIdentityStore;
	readonly relayIdentity?: RelayIdentity;
}): SetSellOrderUpiAction {
	const { publicClient, diamondAddress, relayIdentityStore, relayIdentity } = input;

	const prepareFn = (params: SetSellOrderUpiParams): ResultAsync<PreparedTx, OrdersError> =>
		validate(
			ZodSetSellOrderUpiParamsSchema,
			params,
			(message, cause, data) =>
				new OrdersError(message, {
					code: "VALIDATION_ERROR",
					cause,
					context: { data },
				}),
		)
			.asyncAndThen((v) =>
				resolveRelayIdentity({ relayIdentity, store: relayIdentityStore }).andThen(
					(senderIdentity) =>
						encryptPaymentAddress({
							paymentAddress: v.paymentAddress,
							recipientPublicKey: v.merchantPublicKey,
							senderIdentity,
						}).map((userEncUpi) => ({ v, userEncUpi, senderIdentity })),
				),
			)
			.map(({ v, userEncUpi, senderIdentity }) => ({
				to: diamondAddress,
				data: encodeFunctionData({
					abi: ABIS.FACETS.ORDER_FLOW,
					functionName: "setSellOrderUpi",
					args: [v.orderId, userEncUpi, v.updatedAmount],
				}),
				value: 0n,
				meta: { relayIdentity: senderIdentity },
			}));

	return {
		prepare(params) {
			return prepareFn(params);
		},
		execute({ walletClient, waitForReceipt, ...params }) {
			return prepareFn(params).andThen((prepared) =>
				submitPreparedTx({ prepared, walletClient, publicClient, waitForReceipt }),
			);
		},
	};
}
