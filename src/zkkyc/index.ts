export type { Zkkyc } from "./client";
export { createZkkyc } from "./client";
export type { ZkkycErrorCode } from "./errors";
export { ZkkycError } from "./errors";
export type { ZkkycConfig } from "./types";
export type {
	AnonAadharProofParams,
	BvnSubmitParams,
	SimpleKycSubmitParams,
	SocialVerifyParams,
	ZkPassportRegisterParams,
} from "./validation";

// ── Orchestrators ────────────────────────────────────────────────────────────

export {
	BVN_OTP_METHODS,
	DEFAULT_RECLAIM_PROVIDER_IDS,
	RECLAIM_APP_LINKS,
	SIMPLE_KYC_DEFAULT_TENANT,
	ZK_PASSPORT_APP_LINKS,
} from "./orchestrators/constants";
export { createBvnFlow } from "./orchestrators/bvn";
export { createReclaimFlow } from "./orchestrators/reclaim";
export { createSimpleKycFlow, resumeSimpleKycFlow } from "./orchestrators/simple-kyc";
export type {
	BvnAttestation,
	BvnDecision,
	BvnFlow,
	BvnFlowConfig,
	BvnMethod,
	BvnOnboardParams,
	BvnOtpMethod,
	BvnScope,
	BvnSendOtpParams,
	BvnSession,
	ReclaimFlowParams,
	ReclaimProofResult,
	ReclaimSession,
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
