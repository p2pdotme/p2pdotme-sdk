import { ResultAsync } from "neverthrow";
import type { Address } from "viem";
import { ProfileError } from "../../profile/errors";
import type { UsdcBalanceParams } from "../../profile/validation";
import { ZodUsdcBalanceParamsSchema } from "../../profile/validation";
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
