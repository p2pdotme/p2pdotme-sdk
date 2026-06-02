import type {
	RawStakeBoostGlobals,
	RawUserStake,
	StakeBoostGlobals,
	StakeStatus,
	UserStake,
} from "./types";

const STATUS_MAP: Record<number, StakeStatus> = {
	0: "none",
	1: "active",
	2: "cooldown",
	3: "seized",
};

/** Normalizes the raw on-chain stake tuple into a typed `UserStake`. */
export function normalizeUserStake(raw: RawUserStake): UserStake {
	return {
		stakedAmount: raw.stakedAmount,
		cooldownEnd: raw.cooldownEnd,
		status: STATUS_MAP[raw.status] ?? "none",
	};
}

/** Normalizes the raw positional tuple from `getStakeBoostGlobals` into a struct. */
export function normalizeStakeBoostGlobals(raw: RawStakeBoostGlobals): StakeBoostGlobals {
	const [
		p2pToken,
		fraudReserve,
		maxStakeTokens,
		normalCooldown,
		blacklistCooldown,
		tokenDecimals,
		totalStaked,
	] = raw;
	return {
		p2pToken,
		fraudReserve,
		maxStakeTokens,
		normalCooldown,
		blacklistCooldown,
		tokenDecimals,
		totalStaked,
	};
}
