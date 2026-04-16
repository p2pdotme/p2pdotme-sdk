import { ResultAsync } from "neverthrow";
import { type Address, stringToHex } from "viem";
import { PricesError } from "../../prices/errors";
import type { PriceConfig, RpPerUsdtLimit } from "../../prices/types";
import type { GetPriceConfigParams, GetRpPerUsdtLimitParams } from "../../prices/validation";
import {
	ZodGetPriceConfigParamsSchema,
	ZodGetRpPerUsdtLimitParamsSchema,
} from "../../prices/validation";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { ABIS } from "../abis";

/** Reads the price config (buy/sell prices) for a given currency. */
export function getPriceConfig(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: GetPriceConfigParams,
): ResultAsync<PriceConfig, PricesError> {
	return validate(
		ZodGetPriceConfigParamsSchema,
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

/** Reads the RP-to-USDC limit ratio for a given currency from the Diamond contract. */
export function getRpPerUsdtLimitRational(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: GetRpPerUsdtLimitParams,
): ResultAsync<RpPerUsdtLimit, PricesError> {
	return validate(
		ZodGetRpPerUsdtLimitParamsSchema,
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
				new PricesError("Failed to read RP per USDT limit rational", {
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
