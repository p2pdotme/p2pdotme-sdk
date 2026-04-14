import { ResultAsync } from "neverthrow";
import { type Address, stringToHex } from "viem";
import { ProfileError } from "../../profile/errors";
import type { PriceConfig } from "../../profile/types";
import type { PriceConfigParams } from "../../profile/validation";
import { ZodPriceConfigParamsSchema } from "../../profile/validation";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { ABIS } from "../abis";

/** Reads the price config (buy/sell prices) for a given currency. */
export function getPriceConfig(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: PriceConfigParams,
): ResultAsync<PriceConfig, ProfileError> {
	return validate(
		ZodPriceConfigParamsSchema,
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
				address: diamondAddress,
				abi: ABIS.FACETS.CONFIG,
				functionName: "getPriceConfig",
				args: [stringToHex(validated.currency, { size: 32 })],
			}) as Promise<PriceConfig>,
			(error) =>
				new ProfileError("Failed to read price config", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { currency: validated.currency, diamondAddress },
				}),
		),
	);
}
