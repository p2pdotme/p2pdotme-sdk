import type { ResultAsync } from "neverthrow";
import { buildPlaceOrderPayload, buildSetSellOrderUpiPayload } from "./actions";
import type { PayloadError } from "./errors";
import type { PayloadGeneratorConfig, PlaceOrderPayload, SetSellOrderUpiPayload } from "./types";
import type { PlaceOrderParams, SetSellOrderUpiParams } from "./validation";

export interface PayloadGenerator {
	placeOrder(params: PlaceOrderParams): ResultAsync<PlaceOrderPayload, PayloadError>;
	setSellOrderUpi(params: SetSellOrderUpiParams): ResultAsync<SetSellOrderUpiPayload, PayloadError>;
}

export function createPayloadGenerator(config: PayloadGeneratorConfig): PayloadGenerator {
	return {
		placeOrder(params: PlaceOrderParams) {
			return buildPlaceOrderPayload(config.orderRouter, params);
		},
		setSellOrderUpi(params: SetSellOrderUpiParams) {
			return buildSetSellOrderUpiPayload(params);
		},
	};
}
