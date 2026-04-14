import type { OrderRouter } from "../order-routing/client";
import type { CurrencyType } from "../types";

export interface PayloadGeneratorConfig {
	readonly orderRouter: OrderRouter;
}

export interface PlaceOrderPayload {
	readonly pubKey: string;
	readonly amount: bigint;
	readonly recipientAddr: `0x${string}`;
	readonly orderType: number;
	readonly userUpi: string;
	readonly userPubKey: string;
	readonly currency: CurrencyType;
	readonly preferredPaymentChannelConfigId: bigint;
	readonly fiatAmountLimit: bigint;
	readonly circleId: bigint;
}

export interface SetSellOrderUpiPayload {
	readonly orderId: number;
	readonly userEncUpi: string;
	readonly updatedAmount: bigint;
}
