import { ResultAsync } from "neverthrow";
import { type Address, formatUnits } from "viem";
import { getPriceConfig, getUsdcBalance } from "../../contracts";
import { validate } from "../../validation";
import { ProfileError } from "../errors";
import type { Balances, GetBalancesParams, PublicClientLike } from "../types";
import { ZodGetBalancesParamsSchema } from "../validation";

/** Fetches USDC balance and fiat equivalent in parallel for a given address and currency. */
export function getBalances(
	publicClient: PublicClientLike,
	usdcAddress: Address,
	diamondAddress: Address,
	params: GetBalancesParams,
): ResultAsync<Balances, ProfileError> {
	return validate(
		ZodGetBalancesParamsSchema,
		params,
		(message, cause, data) =>
			new ProfileError(message, {
				code: "VALIDATION_ERROR",
				cause,
				context: { params: data },
			}),
	).asyncAndThen((validated) =>
		ResultAsync.combine([
			getUsdcBalance(publicClient, usdcAddress, {
				address: validated.address,
			}),
			getPriceConfig(publicClient, diamondAddress, {
				currency: validated.currency,
			}),
		]).map(([usdc, priceConfig]) => {
			const usdcFormatted = Number(formatUnits(usdc, 6));
			const sellPriceFormatted = Number(formatUnits(priceConfig.sellPrice, 6));
			return {
				usdc: usdcFormatted,
				fiat: usdcFormatted * sellPriceFormatted,
				sellPrice: sellPriceFormatted,
			};
		}),
	);
}
