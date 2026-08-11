import { Result } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { validate } from "../../validation";
import { ZkkycError } from "../../zkkyc/errors";
import type {
	AnonAadharProofParams,
	BvnSubmitParams,
	LivenessSubmitParams,
	SimpleKycSubmitParams,
	SocialVerifyParams,
	ZkPassportRegisterParams,
} from "../../zkkyc/validation";
import {
	ZodAnonAadharProofParamsSchema,
	ZodBvnSubmitParamsSchema,
	ZodLivenessSubmitParamsSchema,
	ZodSimpleKycSubmitParamsSchema,
	ZodSocialVerifyParamsSchema,
	ZodZkPassportRegisterParamsSchema,
} from "../../zkkyc/validation";
import { ABIS } from "../abis";

/** Prepares a social verification transaction. */
export function prepareSocialVerify(
	reputationManagerAddress: Address,
	params: SocialVerifyParams,
): Result<{ to: Address; data: `0x${string}` }, ZkkycError> {
	return validate(
		ZodSocialVerifyParamsSchema,
		params,
		(message, cause, data) =>
			new ZkkycError(message, { code: "VALIDATION_ERROR", cause, context: { params: data } }),
	).andThen((validated) =>
		Result.fromThrowable(
			() => ({
				to: reputationManagerAddress,
				data: encodeFunctionData({
					abi: ABIS.EXTERNAL.REPUTATION_MANAGER,
					functionName: "socialVerify",
					args: [
						validated._socialName,
						validated.proofs.map((proof) => ({
							...proof,
							signedClaim: {
								...proof.signedClaim,
								claim: {
									...proof.signedClaim.claim,
									identifier: proof.signedClaim.claim.identifier as `0x${string}`,
								},
								signatures: proof.signedClaim.signatures as readonly `0x${string}`[],
							},
						})),
					],
				}),
			}),
			(error) =>
				new ZkkycError("Failed to encode socialVerify", {
					code: "ENCODE_ERROR",
					cause: error,
				}),
		)(),
	);
}

/** Prepares a submit anon Aadhaar proof transaction. */
export function prepareSubmitAnonAadharProof(
	reputationManagerAddress: Address,
	params: AnonAadharProofParams,
): Result<{ to: Address; data: `0x${string}` }, ZkkycError> {
	return validate(
		ZodAnonAadharProofParamsSchema,
		params,
		(message, cause, data) =>
			new ZkkycError(message, { code: "VALIDATION_ERROR", cause, context: { params: data } }),
	).andThen((validated) =>
		Result.fromThrowable(
			() => ({
				to: reputationManagerAddress,
				data: encodeFunctionData({
					abi: ABIS.EXTERNAL.REPUTATION_MANAGER,
					functionName: "submitAnonAadharProof",
					args: [
						validated.nullifierSeed,
						validated.nullifier,
						validated.timestamp,
						validated.signal,
						validated.revealArray,
						validated.packedGroth16Proof,
					],
				}),
			}),
			(error) =>
				new ZkkycError("Failed to encode submitAnonAadharProof", {
					code: "ENCODE_ERROR",
					cause: error,
				}),
		)(),
	);
}

/** Prepares a simple-kyc EIP-712 attestation submission (awards KYC rp). */
export function prepareSubmitKycAttestation(
	reputationManagerAddress: Address,
	params: SimpleKycSubmitParams,
): Result<{ to: Address; data: `0x${string}` }, ZkkycError> {
	return validate(
		ZodSimpleKycSubmitParamsSchema,
		params,
		(message, cause, data) =>
			new ZkkycError(message, { code: "VALIDATION_ERROR", cause, context: { params: data } }),
	).andThen((validated) =>
		Result.fromThrowable(
			() => ({
				to: reputationManagerAddress,
				data: encodeFunctionData({
					abi: ABIS.EXTERNAL.REPUTATION_MANAGER,
					functionName: "submitKycAttestation",
					args: [
						validated.nullifier as `0x${string}`,
						validated.limit,
						validated.expiry,
						validated.signature as `0x${string}`,
					],
				}),
			}),
			(error) =>
				new ZkkycError("Failed to encode submitKycAttestation", {
					code: "ENCODE_ERROR",
					cause: error,
				}),
		)(),
	);
}

/** Prepares a BVN EIP-712 attestation submission (awards BVN rp). */
export function prepareSubmitBvnAttestation(
	reputationManagerAddress: Address,
	params: BvnSubmitParams,
): Result<{ to: Address; data: `0x${string}` }, ZkkycError> {
	return validate(
		ZodBvnSubmitParamsSchema,
		params,
		(message, cause, data) =>
			new ZkkycError(message, { code: "VALIDATION_ERROR", cause, context: { params: data } }),
	).andThen((validated) =>
		Result.fromThrowable(
			() => ({
				to: reputationManagerAddress,
				data: encodeFunctionData({
					abi: ABIS.EXTERNAL.REPUTATION_MANAGER,
					functionName: "submitBvnAttestation",
					args: [
						validated.nullifier as `0x${string}`,
						validated.limit,
						validated.expiry,
						validated.signature as `0x${string}`,
					],
				}),
			}),
			(error) =>
				new ZkkycError("Failed to encode submitBvnAttestation", {
					code: "ENCODE_ERROR",
					cause: error,
				}),
		)(),
	);
}

/** Prepares a liveness EIP-712 attestation submission (awards liveness rp).
 *
 * Same struct shape as the KYC one but a different on-chain function: the
 * liveness verifier is a separate service with its own EIP-712 domain and its
 * own nullifier set, so the two attestations are not interchangeable.
 */
export function prepareSubmitLivenessAttestation(
	reputationManagerAddress: Address,
	params: LivenessSubmitParams,
): Result<{ to: Address; data: `0x${string}` }, ZkkycError> {
	return validate(
		ZodLivenessSubmitParamsSchema,
		params,
		(message, cause, data) =>
			new ZkkycError(message, { code: "VALIDATION_ERROR", cause, context: { params: data } }),
	).andThen((validated) =>
		Result.fromThrowable(
			() => ({
				to: reputationManagerAddress,
				data: encodeFunctionData({
					abi: ABIS.EXTERNAL.REPUTATION_MANAGER,
					functionName: "submitLivenessAttestation",
					args: [
						validated.nullifier as `0x${string}`,
						validated.limit,
						validated.expiry,
						validated.signature as `0x${string}`,
					],
				}),
			}),
			(error) =>
				new ZkkycError("Failed to encode submitLivenessAttestation", {
					code: "ENCODE_ERROR",
					cause: error,
				}),
		)(),
	);
}

/** Prepares a zkPassport registration transaction. */
export function prepareZkPassportRegister(
	reputationManagerAddress: Address,
	params: ZkPassportRegisterParams,
): Result<{ to: Address; data: `0x${string}` }, ZkkycError> {
	return validate(
		ZodZkPassportRegisterParamsSchema,
		params,
		(message, cause, data) =>
			new ZkkycError(message, { code: "VALIDATION_ERROR", cause, context: { params: data } }),
	).andThen((validated) =>
		Result.fromThrowable(
			() => {
				const { proofVerificationData, serviceConfig, committedInputs, version } = validated.params;

				const proofVerificationParams = {
					version: version as `0x${string}`,
					proofVerificationData: {
						vkeyHash: proofVerificationData.vkeyHash as `0x${string}`,
						proof: proofVerificationData.proof as `0x${string}`,
						publicInputs: proofVerificationData.publicInputs as `0x${string}`[],
					},
					committedInputs: committedInputs as `0x${string}`,
					serviceConfig: {
						validityPeriodInSeconds: BigInt(serviceConfig.validityPeriodInSeconds),
						domain: serviceConfig.domain,
						scope: serviceConfig.scope,
						devMode: serviceConfig.devMode,
					},
				};

				return {
					to: reputationManagerAddress,
					data: encodeFunctionData({
						abi: ABIS.EXTERNAL.REPUTATION_MANAGER,
						functionName: "zkPassportRegister",
						args: [proofVerificationParams, validated.isIDCard],
					}),
				};
			},
			(error) =>
				new ZkkycError("Failed to encode zkPassportRegister", {
					code: "ENCODE_ERROR",
					cause: error,
				}),
		)(),
	);
}
