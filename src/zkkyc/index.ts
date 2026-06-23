export type { Zkkyc } from "./client";
export { createZkkyc } from "./client";
export type { ZkkycErrorCode } from "./errors";
export { ZkkycError } from "./errors";
export type { ZkkycConfig } from "./types";
export type {
	AnonAadharProofParams,
	SimpleKycSubmitParams,
	SocialVerifyParams,
	ZkPassportRegisterParams,
} from "./validation";

// ── Orchestrators ────────────────────────────────────────────────────────────

export {
	DEFAULT_RECLAIM_PROVIDER_IDS,
	RECLAIM_APP_LINKS,
	SIMPLE_KYC_DEFAULT_TENANT,
	ZK_PASSPORT_APP_LINKS,
} from "./orchestrators/constants";
export { createReclaimFlow } from "./orchestrators/reclaim";
export { createSimpleKycFlow, resumeSimpleKycFlow } from "./orchestrators/simple-kyc";
export type {
	ReclaimFlowParams,
	ReclaimProofResult,
	ReclaimStatus,
	SimpleKycAttestation,
	SimpleKycFlowParams,
	SimpleKycSession,
	SimpleKycStatus,
	SocialPlatform,
	ZkPassportFlowParams,
	ZkPassportProofResult,
	ZkPassportSession,
	ZkPassportStatus,
} from "./orchestrators/types";
export { SOCIAL_PLATFORM_NAMES } from "./orchestrators/types";
export { createZkPassportFlow } from "./orchestrators/zk-passport";
