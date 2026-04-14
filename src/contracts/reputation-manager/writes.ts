import { Result } from "neverthrow";
import { type Address, encodeFunctionData } from "viem";
import { validate } from "../../validation";
import { ZkkycError } from "../../zkkyc/errors";
import type {
	AnonAadharProofParams,
	SocialVerifyParams,
	ZkPassportRegisterParams,
} from "../../zkkyc/validation";
import {
	ZodAnonAadharProofParamsSchema,
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
