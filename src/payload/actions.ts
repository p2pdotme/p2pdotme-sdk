import { errAsync, type ResultAsync } from "neverthrow";
import { ORDER_TYPE } from "../constants";
import type { OrderRouter } from "../order-routing/client";
import { validate } from "../validation";
import { encryptPaymentAddress } from "./crypto";
import { PayloadError } from "./errors";
import { getRelayIdentity } from "./relay-identity";
import type { PlaceOrderPayload, SetSellOrderUpiPayload } from "./types";
import {
	type PlaceOrderParams,
	type SetSellOrderUpiParams,
	ZodPlaceOrderParamsSchema,
	ZodSetSellOrderUpiParamsSchema,
} from "./validation";

/**
 * Validates order params, selects an eligible circle via epsilon-greedy routing,
 * resolves a relay identity, and assembles the final on-chain payload.
 */
export function buildPlaceOrderPayload(
	orderRouter: OrderRouter,
	params: PlaceOrderParams,
): ResultAsync<PlaceOrderPayload, PayloadError> {
	const validation = validate(
		ZodPlaceOrderParamsSchema,
		params,
		(message, cause, data) =>
			new PayloadError(message, { code: "VALIDATION_ERROR", cause, context: { data } }),
	);
	if (validation.isErr()) {
		return errAsync(validation.error);
	}

	const v = validation.value;
	const isBuy = v.orderType === ORDER_TYPE.BUY;
	const pcConfigId = v.preferredPaymentChannelConfigId ?? 0n;

	const circleResult = orderRouter.selectCircle({
		currency: v.currency,
		user: v.user,
		usdtAmount: v.amount,
		fiatAmount: v.fiatAmount,
		orderType: BigInt(v.orderType),
		preferredPCConfigId: pcConfigId,
	});

	const relayResult = getRelayIdentity();
	if (relayResult.isErr()) {
		return errAsync(relayResult.error);
	}

	const common = {
		amount: v.amount,
		recipientAddr: v.recipientAddr,
		orderType: v.orderType,
		userUpi: "",
		currency: v.currency,
		preferredPaymentChannelConfigId: pcConfigId,
		fiatAmountLimit: v.fiatAmountLimit,
	};

	const pubKeyValue = v.pubKey ?? relayResult.value.publicKey;

	return circleResult
		.map((circleId) => ({
			...common,
			pubKey: isBuy ? pubKeyValue : "",
			userPubKey: isBuy ? "" : pubKeyValue,
			circleId,
		}))
		.mapErr(
			(e) =>
				new PayloadError(e.message, {
					code: "CIRCLE_SELECTION_ERROR",
					cause: e,
				}),
		);
}

/**
 * Validates params, encrypts the payment address with the order's public key,
 * and builds the payload for setting encrypted UPI on a sell order.
 */
export function buildSetSellOrderUpiPayload(
	params: SetSellOrderUpiParams,
): ResultAsync<SetSellOrderUpiPayload, PayloadError> {
	const validation = validate(
		ZodSetSellOrderUpiParamsSchema,
		params,
		(message, cause, data) =>
			new PayloadError(message, { code: "VALIDATION_ERROR", cause, context: { data } }),
	);
	if (validation.isErr()) {
		return errAsync(validation.error);
	}

	const v = validation.value;

	return encryptPaymentAddress(v.paymentAddress, v.merchantPublicKey).map((userEncUpi) => ({
		orderId: v.orderId,
		userEncUpi,
		updatedAmount: v.updatedAmount,
	}));
}
