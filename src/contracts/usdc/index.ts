import { ResultAsync } from "neverthrow";
import type { Address } from "viem";
import { erc20Abi } from "viem";
import { ProfileError } from "../../profile/errors";
import type { UsdcAllowanceParams, UsdcBalanceParams } from "../../profile/validation";
import { ZodUsdcAllowanceParamsSchema, ZodUsdcBalanceParamsSchema } from "../../profile/validation";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { ABIS } from "../abis";

/** Reads the USDC balance for a given address. */
export function getUsdcBalance(
	publicClient: PublicClientLike,
	usdcAddress: Address,
	params: UsdcBalanceParams,
): ResultAsync<bigint, ProfileError> {
	return validate(
		ZodUsdcBalanceParamsSchema,
		params,
		(message, cause, data) =>
			new ProfileError(message, {
				code: "VALIDATION_ERROR",
				cause,
				context: { params: data },
			}),
	).asyncAndThen((validated) =>
		ResultAsync.fromPromise(
			publicClient.readContract({
				address: usdcAddress,
				abi: ABIS.EXTERNAL.USDC,
				functionName: "balanceOf",
				args: [validated.address],
			}) as Promise<bigint>,
			(error) =>
				new ProfileError("Failed to read USDC balance", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { address: validated.address, usdcAddress },
				}),
		),
	);
}

/** Reads the USDC allowance `owner → diamond`. */
export function getUsdcAllowance(
	publicClient: PublicClientLike,
	usdcAddress: Address,
	diamondAddress: Address,
	params: UsdcAllowanceParams,
): ResultAsync<bigint, ProfileError> {
	return validate(
		ZodUsdcAllowanceParamsSchema,
		params,
		(message, cause, data) =>
			new ProfileError(message, {
				code: "VALIDATION_ERROR",
				cause,
				context: { params: data },
			}),
	).asyncAndThen((validated) =>
		ResultAsync.fromPromise(
			publicClient.readContract({
				address: usdcAddress,
				abi: erc20Abi,
				functionName: "allowance",
				args: [validated.owner, diamondAddress],
			}) as Promise<bigint>,
			(error) =>
				new ProfileError("Failed to read USDC allowance", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { owner: validated.owner, usdcAddress, diamondAddress },
				}),
		),
	);
}
