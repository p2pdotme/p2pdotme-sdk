import type { Address } from "viem";
import type { FraudEngine } from "../fraud-engine/types";
import type { Logger } from "../lib";
import type { OrdersClient, RelayIdentity, RelayIdentityStore } from "../orders";
import type { PublicClientLike } from "../types";

export interface FraudEngineSdkConfig {
	readonly apiUrl: string;
	readonly encryptionKey: string;
	readonly seonRegion?: string;
}

export interface OrdersSdkConfig {
	readonly relayIdentityStore?: RelayIdentityStore;
	readonly relayIdentity?: RelayIdentity;
}

export interface SdkConfig {
	readonly publicClient: PublicClientLike;
	readonly subgraphUrl: string;
	readonly diamondAddress: Address;
	readonly usdcAddress: Address;
	readonly reputationManagerAddress?: Address;
	readonly fraudEngine?: FraudEngineSdkConfig;
	readonly orders?: OrdersSdkConfig;
	readonly logger?: Logger;
}

export interface Sdk {
	readonly profile: import("../profile/client").Profile;
	readonly prices: import("../prices/client").Prices;
	readonly orders: OrdersClient;
	readonly zkkyc?: import("../zkkyc/client").Zkkyc;
	readonly fraudEngine?: FraudEngine;
}
