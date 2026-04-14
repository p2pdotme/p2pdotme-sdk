import type { Address } from "viem";
import type { FraudEngine } from "../fraud-engine/types";
import type { Logger } from "../lib";
import type { PublicClientLike } from "../types";

export interface FraudEngineSdkConfig {
	readonly apiUrl: string;
	readonly encryptionKey: string;
	readonly seonRegion?: string;
}

export interface SdkConfig {
	readonly publicClient: PublicClientLike;
	readonly subgraphUrl: string;
	readonly diamondAddress: Address;
	readonly usdcAddress: Address;
	readonly reputationManagerAddress?: Address;
	readonly fraudEngine?: FraudEngineSdkConfig;
	readonly logger?: Logger;
}

export interface Sdk {
	readonly profile: import("../profile/client").Profile;
	readonly orderRouter: import("../order-routing/client").OrderRouter;
	readonly payload: import("../payload/client").PayloadGenerator;
	readonly zkkyc?: import("../zkkyc/client").Zkkyc;
	readonly fraudEngine?: FraudEngine;
}
