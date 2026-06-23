import { z } from "zod";
import { ZodAddressSchema } from "../validation";

// ── Write param schemas ──────────────────────────────────────────────────────

export const ZodAnonAadharProofParamsSchema = z.object({
	nullifierSeed: z.bigint(),
	nullifier: z.bigint(),
	timestamp: z.bigint(),
	signal: z.bigint(),
	revealArray: z.tuple([z.bigint(), z.bigint(), z.bigint(), z.bigint()]),
	packedGroth16Proof: z.tuple([
		z.bigint(),
		z.bigint(),
		z.bigint(),
		z.bigint(),
		z.bigint(),
		z.bigint(),
		z.bigint(),
		z.bigint(),
	]),
});

export type AnonAadharProofParams = z.infer<typeof ZodAnonAadharProofParamsSchema>;

export const ZodSocialVerifyParamsSchema = z.object({
	_socialName: z.string(),
	proofs: z.array(
		z.object({
			claimInfo: z.object({
				provider: z.string(),
				parameters: z.string(),
				context: z.string(),
			}),
			signedClaim: z.object({
				claim: z.object({
					identifier: z.string(),
					owner: ZodAddressSchema,
					timestampS: z.number(),
					epoch: z.number(),
				}),
				signatures: z.array(z.string()),
			}),
		}),
	),
});

export type SocialVerifyParams = z.infer<typeof ZodSocialVerifyParamsSchema>;

// Schema matching SolidityVerifierParameters from @zkpassport/sdk (structural definition)
export const ZodSolidityVerifierParametersSchema = z.object({
	version: z.string().refine((val) => val.startsWith("0x"), {
		message: "Version must be a hex string",
	}),
	proofVerificationData: z.object({
		vkeyHash: z.string().refine((val) => /^0x[a-fA-F0-9]{64}$/.test(val), {
			message: "Invalid bytes32 hex string",
		}),
		proof: z.string().refine((val) => val.startsWith("0x"), {
			message: "Proof must be a hex string",
		}),
		publicInputs: z.array(
			z.string().refine((val) => /^0x[a-fA-F0-9]{64}$/.test(val), {
				message: "Each public input must be a valid bytes32 hex string",
			}),
		),
	}),
	committedInputs: z.string().refine((val) => val.startsWith("0x"), {
		message: "Committed inputs must be a hex string",
	}),
	serviceConfig: z.object({
		validityPeriodInSeconds: z.number().int().nonnegative(),
		domain: z.string(),
		scope: z.string(),
		devMode: z.boolean(),
	}),
});

export type SolidityVerifierParameters = z.infer<typeof ZodSolidityVerifierParametersSchema>;

export const ZodZkPassportRegisterParamsSchema = z.object({
	params: ZodSolidityVerifierParametersSchema,
	isIDCard: z.boolean(),
});

export type ZkPassportRegisterParams = z.infer<typeof ZodZkPassportRegisterParamsSchema>;

// ── simple-kyc EIP-712 attestation ───────────────────────────────────────────

export const ZodSimpleKycSubmitParamsSchema = z.object({
	/** Per-(tenant, identity) Sybil nullifier (bytes32 hex). */
	nullifier: z.string().refine((v) => /^0x[a-fA-F0-9]{64}$/.test(v), {
		message: "nullifier must be a bytes32 hex string",
	}),
	/** Remaining limit in micro-USDC (part of the signed struct). */
	limit: z.bigint(),
	/** Attestation expiry (unix seconds). */
	expiry: z.bigint(),
	/** 65-byte secp256k1 signature (hex). */
	signature: z.string().refine((v) => /^0x[a-fA-F0-9]+$/.test(v), {
		message: "signature must be a hex string",
	}),
});

export type SimpleKycSubmitParams = z.infer<typeof ZodSimpleKycSubmitParamsSchema>;
