import { ResultAsync } from "neverthrow";
import { type Address, stringToHex } from "viem";
import { PricesError } from "../../prices/errors";
import type { PriceConfig, ReputationLimit } from "../../prices/types";
import type { CurrencyScopedParams } from "../../prices/validation";
import { ZodCurrencyScopedParamsSchema } from "../../prices/validation";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { ABIS } from "../abis";

/** Reads the price config (buy/sell prices) for a given currency. */
export function getPriceConfig(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: CurrencyScopedParams,
): ResultAsync<PriceConfig, PricesError> {
	return validate(
		ZodCurrencyScopedParamsSchema,
		params,
		(message, cause, data) =>
			new PricesError(message, {
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
				new PricesError("Failed to read price config", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { currency: validated.currency, diamondAddress },
				}),
		),
	);
}

/**
 * Reads the per-currency USDC transaction limit granted per Reputation Point (RP).
 * Default is 1 RP = 2 USDC everywhere except INR.
 */
export function getReputationPerUsdcLimit(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: CurrencyScopedParams,
): ResultAsync<ReputationLimit, PricesError> {
	return validate(
		ZodCurrencyScopedParamsSchema,
		params,
		(message, cause, data) =>
			new PricesError(message, {
				code: "VALIDATION_ERROR",
				cause,
				context: { params: data },
			}),
	).asyncAndThen((validated) =>
		ResultAsync.fromPromise(
			publicClient.readContract({
				address: diamondAddress,
				abi: ABIS.DIAMOND,
				functionName: "getRpPerUsdtLimitRational",
				args: [stringToHex(validated.currency, { size: 32 })],
			}) as Promise<readonly [bigint, bigint]>,
			(error) =>
				new PricesError("Failed to read reputation-per-USDC limit", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { currency: validated.currency, diamondAddress },
				}),
		).map(([numerator, denominator]) => ({
			numerator,
			denominator,
			multiplier: numerator > 0n ? Number(denominator) / Number(numerator) : 0,
		})),
	);
}
