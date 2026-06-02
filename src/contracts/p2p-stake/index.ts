import { ResultAsync } from "neverthrow";
import type { Address } from "viem";
import { StakeError } from "../../stake/errors";
import type { RawUserStake } from "../../stake/types";
import type { GetUserStakeParams } from "../../stake/validation";
import { ZodGetUserStakeParamsSchema } from "../../stake/validation";
import type { PublicClientLike } from "../../types";
import { validate } from "../../validation";
import { ABIS } from "../abis";

/**
 * Reads the on-chain stake record for a user — `stakedAmount`, `cooldownEnd`,
 * and `status` from the P2P stake boost facet.
 */
export function getUserStake(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: GetUserStakeParams,
): ResultAsync<RawUserStake, StakeError> {
	return validate(
		ZodGetUserStakeParamsSchema,
		params,
		(message, cause, data) =>
			new StakeError(message, {
				code: "VALIDATION_ERROR",
				cause,
				context: { params: data },
			}),
	).asyncAndThen((validated) =>
		ResultAsync.fromPromise(
			publicClient.readContract({
				address: diamondAddress,
				abi: ABIS.FACETS.STAKE,
				functionName: "getUserStake",
				args: [validated.user],
			}) as Promise<RawUserStake>,
			(error) =>
				new StakeError("Failed to read user stake", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { user: validated.user, diamondAddress },
				}),
		),
	);
}
