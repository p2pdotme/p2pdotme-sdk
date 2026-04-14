import type { Result } from "neverthrow";
import type { Address } from "viem";
import {
	prepareSocialVerify,
	prepareSubmitAnonAadharProof,
	prepareZkPassportRegister,
} from "../contracts/reputation-manager/writes";
import type { ZkkycError } from "./errors";
import type { ZkkycConfig } from "./types";
import type {
	AnonAadharProofParams,
	SocialVerifyParams,
	ZkPassportRegisterParams,
} from "./validation";

export interface Zkkyc {
	prepareSocialVerify(
		params: SocialVerifyParams,
	): Result<{ to: Address; data: `0x${string}` }, ZkkycError>;
	prepareSubmitAnonAadharProof(
		params: AnonAadharProofParams,
	): Result<{ to: Address; data: `0x${string}` }, ZkkycError>;
	prepareZkPassportRegister(
		params: ZkPassportRegisterParams,
	): Result<{ to: Address; data: `0x${string}` }, ZkkycError>;
}

/**
 * Creates a Zkkyc client that binds a reputation manager address,
 * exposing write-preparation methods for social verify, Aadhaar, and ZK Passport.
 */
export function createZkkyc(config: ZkkycConfig): Zkkyc {
	const { reputationManagerAddress } = config;
	return {
		prepareSocialVerify: (params) => prepareSocialVerify(reputationManagerAddress, params),
		prepareSubmitAnonAadharProof: (params) =>
			prepareSubmitAnonAadharProof(reputationManagerAddress, params),
		prepareZkPassportRegister: (params) =>
			prepareZkPassportRegister(reputationManagerAddress, params),
	};
}
