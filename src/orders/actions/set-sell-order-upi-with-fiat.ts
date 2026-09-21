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
import {
	type SetSellOrderUpiWithFiatParams,
	ZodSetSellOrderUpiWithFiatParamsSchema,
} from "../validation";

export interface SetSellOrderUpiWithFiatAction {
	prepare(params: SetSellOrderUpiWithFiatParams): ResultAsync<PreparedTx, OrdersError>;
	execute(params: SetSellOrderUpiWithFiatParams & ExecuteBase): ResultAsync<TxResult, OrdersError>;
}

/**
 * Resolves the caller's relay identity and ECIES-encrypts `paymentAddress` for
 * the merchant.
 *
 * @internal Not part of the public surface.
 */
function encryptUpiForMerchant(input: {
	readonly paymentAddress: string;
	readonly merchantPublicKey: string;
	readonly relayIdentityStore: RelayIdentityStore;
	readonly relayIdentity?: RelayIdentity;
}): ResultAsync<{ userEncUpi: string; senderIdentity: RelayIdentity }, OrdersError> {
	const { paymentAddress, merchantPublicKey, relayIdentityStore, relayIdentity } = input;
	return resolveRelayIdentity({ relayIdentity, store: relayIdentityStore }).andThen(
		(senderIdentity) =>
			encryptPaymentAddress({
				paymentAddress,
				recipientPublicKey: merchantPublicKey,
				senderIdentity,
			}).map((userEncUpi) => ({ userEncUpi, senderIdentity })),
	);
}

/**
 * Creates the setSellOrderUpiWithFiat action: hands the ECIES-encrypted payment
 * address to the merchant and flips the order to PAID.
 *
 * This is the SDK's only hand-off action. The Diamond also exposes a legacy
 * `setSellOrderUpi(orderId, encUpi, updatedUsdcAmount)` that fixes the **USDC**
 * leg and derives a rounded fiat; the SDK deliberately does not wrap it. A PAY
 * order is a fiat invoice quoted by the payee (e.g. a merchant QR), so the
 * amount update must pin the **fiat** leg: `fiatAmount` is written as exactly
 * `updatedFiatAmount` and the USDC pulled from the user is derived from it,
 * rounded *up* so it always covers the fiat in full.
 *
 * `updatedFiatAmount` is 6-dec scaled like `Order.fiatAmount`; `0n` (or the
 * order's current fiat) keeps the amounts unchanged — SELL orders always pass `0n`.
 */
export function createSetSellOrderUpiWithFiatAction(input: {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
	readonly relayIdentityStore: RelayIdentityStore;
	readonly relayIdentity?: RelayIdentity;
}): SetSellOrderUpiWithFiatAction {
	const { publicClient, diamondAddress, relayIdentityStore, relayIdentity } = input;

	const prepareFn = (params: SetSellOrderUpiWithFiatParams): ResultAsync<PreparedTx, OrdersError> =>
		validate(
			ZodSetSellOrderUpiWithFiatParamsSchema,
			params,
			(message, cause, data) =>
				new OrdersError(message, {
					code: "VALIDATION_ERROR",
					cause,
					context: { data },
				}),
		)
			.asyncAndThen((v) =>
				encryptUpiForMerchant({
					paymentAddress: v.paymentAddress,
					merchantPublicKey: v.merchantPublicKey,
					relayIdentityStore,
					relayIdentity,
				}).map(({ userEncUpi, senderIdentity }) => ({ v, userEncUpi, senderIdentity })),
			)
			.map(({ v, userEncUpi, senderIdentity }) => ({
				to: diamondAddress,
				data: encodeFunctionData({
					abi: ABIS.FACETS.ORDER_FLOW,
					functionName: "setSellOrderUpiWithFiat",
					args: [v.orderId, userEncUpi, v.updatedFiatAmount],
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
