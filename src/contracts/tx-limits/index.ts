import { ResultAsync } from "neverthrow";
import { type Address, formatUnits, stringToHex } from "viem";
import { ProfileError } from "../../profile/errors";
import type { TxLimitsParams } from "../../profile/validation";
import { ZodTxLimitsParamsSchema } from "../../profile/validation";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { ABIS } from "../abis";

export interface TxLimits {
	readonly buyLimit: number;
	readonly sellLimit: number;
}

/** Reads the buy and sell transaction limits for a given address and currency. */
export function getTxLimits(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: TxLimitsParams,
): ResultAsync<TxLimits, ProfileError> {
	return validate(
		ZodTxLimitsParamsSchema,
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
				abi: ABIS.FACETS.ORDER_FLOW,
				functionName: "userTxLimit",
				args: [validated.address, stringToHex(validated.currency, { size: 32 })],
			}) as Promise<readonly [bigint, bigint]>,
			(error) =>
				new ProfileError("Failed to read tx limits", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { address: validated.address, currency: validated.currency, diamondAddress },
				}),
		).map(([buyLimit, sellLimit]) => ({
			buyLimit: Number(formatUnits(buyLimit, 6)),
			sellLimit: Number(formatUnits(sellLimit, 6)),
		})),
	);
}
