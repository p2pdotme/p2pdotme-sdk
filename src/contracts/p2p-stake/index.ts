import { ResultAsync } from "neverthrow";
import { type Address, stringToHex } from "viem";
import { StakeError } from "../../stake/errors";
import type { RawStakeBoostGlobals, RawUserStake, StakeBoostConfig } from "../../stake/types";
import type {
	GetP2pTokenBalanceParams,
	GetStakeBoostConfigParams,
	GetUserStakeParams,
} from "../../stake/validation";
import {
	ZodGetP2pTokenBalanceParamsSchema,
	ZodGetStakeBoostConfigParamsSchema,
	ZodGetUserStakeParamsSchema,
} from "../../stake/validation";
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

/**
 * Reads the per-currency stake boost config — tokens-per-USD ratio and the
 * maximum USD boost a stake can unlock.
 */
export function getStakeBoostConfig(
	publicClient: PublicClientLike,
	diamondAddress: Address,
	params: GetStakeBoostConfigParams,
): ResultAsync<StakeBoostConfig, StakeError> {
	return validate(
		ZodGetStakeBoostConfigParamsSchema,
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
				functionName: "getStakeBoostConfig",
				args: [stringToHex(validated.currency, { size: 32 })],
			}) as Promise<StakeBoostConfig>,
			(error) =>
				new StakeError("Failed to read stake boost config", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { currency: validated.currency, diamondAddress },
				}),
		),
	);
}

/**
 * Reads the global stake boost configuration — p2p token address, fraud reserve,
 * cooldown durations, token decimals, and total staked across all users.
 */
export function getStakeBoostGlobals(
	publicClient: PublicClientLike,
	diamondAddress: Address,
): ResultAsync<RawStakeBoostGlobals, StakeError> {
	return ResultAsync.fromPromise(
		publicClient.readContract({
			address: diamondAddress,
			abi: ABIS.FACETS.STAKE,
			functionName: "getStakeBoostGlobals",
			args: [],
		}) as Promise<RawStakeBoostGlobals>,
		(error) =>
			new StakeError("Failed to read stake boost globals", {
				code: "CONTRACT_READ_ERROR",
				cause: error,
				context: { diamondAddress },
			}),
	);
}

/** Reads the P2P token (ERC20) balance for a given address. */
export function getP2pTokenBalance(
	publicClient: PublicClientLike,
	p2pTokenAddress: Address,
	params: GetP2pTokenBalanceParams,
): ResultAsync<bigint, StakeError> {
	return validate(
		ZodGetP2pTokenBalanceParamsSchema,
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
				address: p2pTokenAddress,
				abi: ABIS.EXTERNAL.USDC,
				functionName: "balanceOf",
				args: [validated.address],
			}) as Promise<bigint>,
			(error) =>
				new StakeError("Failed to read P2P token balance", {
					code: "CONTRACT_READ_ERROR",
					cause: error,
					context: { address: validated.address, p2pTokenAddress },
				}),
		),
	);
}
