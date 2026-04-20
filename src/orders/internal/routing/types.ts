import type { Address } from "viem";
import type { Logger } from "../../../lib";
import type { PublicClientLike } from "../../../types";

export type { Logger } from "../../../lib";
export type { PublicClientLike } from "../../../types";

// ── Circle types ────────────────────────────────────────────────────────

export interface CircleScoreState {
	readonly activeMerchantsCount: number;
}

export interface CircleMetrics {
	readonly circleScore: number;
	readonly circleStatus: string;
	readonly scoreState: CircleScoreState;
}

export interface CircleForRouting {
	readonly circleId: string;
	readonly currency: string;
	readonly metrics: CircleMetrics;
}

// ── Eligibility check params ────────────────────────────────────────────

export interface CheckCircleEligibilityParams {
	readonly circleId: bigint;
	readonly currency: string;
	readonly user: Address;
	readonly usdtAmount: bigint;
	readonly fiatAmount: bigint;
	readonly orderType: bigint;
	readonly preferredPCConfigId: bigint;
}

// ── Select circle params ────────────────────────────────────────────────

export interface SelectCircleParams {
	readonly currency: string;
	readonly user: Address;
	readonly usdtAmount: bigint;
	readonly fiatAmount: bigint;
	readonly orderType: bigint;
	readonly preferredPCConfigId: bigint;
}

// ── Client config ───────────────────────────────────────────────────────

export interface OrderRoutingConfig {
	readonly subgraphUrl: string;
	readonly publicClient: PublicClientLike;
	readonly contractAddress: Address;
	readonly logger?: Logger;
}
