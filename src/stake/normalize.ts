import type { RawUserStake, StakeStatus, UserStake } from "./types";

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
