import { errAsync, okAsync, type ResultAsync } from "neverthrow";
import { noopLogger } from "../../../lib";
import { OrderRoutingError } from "./errors";
import type { CircleForRouting, Logger } from "./types";

const EPSILON = 0.25;
const RECOVERY_SCALE = 0.3;
const BOOTSTRAP_MAX_WEIGHT = 25;
const BOOTSTRAP_RESERVE = 0.1;
const MAX_VALIDATION_ATTEMPTS = 3;

/**
 * Status-adjusted score for a circle, before applying capacity.
 * Active: raw score. Bootstrap: capped at BOOTSTRAP_MAX_WEIGHT.
 * Paused: scaled by RECOVERY_SCALE.
 */
function baseScore(c: CircleForRouting): number {
	const score = c.metrics.circleScore;
	if (c.metrics.circleStatus === "paused") {
		return score * RECOVERY_SCALE;
	}
	if (c.metrics.circleStatus === "bootstrap") {
		return Math.min(score, BOOTSTRAP_MAX_WEIGHT);
	}
	return score;
}

/**
 * Routing weight = base(score, status) × availableMerchantsCount.
 * Linear capacity is equivalent to weighting each merchant by their circle's
 * score, so per-merchant load ratio equals the score ratio — bounded by
 * quality, not by structural pool-size disparity.
 */
export function circleWeight(c: CircleForRouting): number {
	return baseScore(c) * c.metrics.scoreState.availableMerchantsCount;
}

/**
 * Filter circles eligible for routing: currency match (case-insensitive) and
 * at least one available merchant. Skipping zero-capacity circles up front
 * saves on-chain eligibility-check retries.
 */
export function filterEligibleCircles(
	circles: readonly CircleForRouting[],
	orderCurrency: string,
): CircleForRouting[] {
	return circles.filter(
		(c) =>
			c.currency.toLowerCase() === orderCurrency.toLowerCase() &&
			c.metrics.scoreState.availableMerchantsCount > 0,
	);
}

function weightedRandomChoice<T>(arr: readonly T[], weights: readonly number[]): T {
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);

	if (totalWeight === 0) {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	let rand = Math.random() * totalWeight;
	for (let i = 0; i < arr.length; i++) {
		rand -= weights[i];
		if (rand <= 0) {
			return arr[i];
		}
	}
	return arr[arr.length - 1];
}

/**
 * Select a circle from the eligible pool.
 *
 * Resolution order:
 *   1. ~BOOTSTRAP_RESERVE share goes only to bootstrap circles (when present),
 *      so new circles can accumulate the order history they need to graduate.
 *   2. ε-greedy split on the remainder: exploit picks from active circles by
 *      circleWeight; explore picks from all eligible by circleWeight.
 *
 * circleWeight already factors in availableMerchantsCount, so capacity is
 * respected on both branches.
 */
export function selectCircle(eligible: readonly CircleForRouting[]): CircleForRouting | null {
	if (eligible.length === 0) {
		return null;
	}

	const bootstrapCircles = eligible.filter((c) => c.metrics.circleStatus === "bootstrap");
	const activeCircles = eligible.filter((c) => c.metrics.circleStatus === "active");

	const r = Math.random();

	// Bootstrap reserve: dedicated share for bootstrap circles to graduate.
	if (r < BOOTSTRAP_RESERVE && bootstrapCircles.length > 0) {
		const weights = bootstrapCircles.map(circleWeight);
		return weightedRandomChoice(bootstrapCircles, weights);
	}

	const isExplore = r < BOOTSTRAP_RESERVE + EPSILON;

	if (isExplore) {
		// Explore: all eligible circles with status-aware, capacity-aware weights.
		const weights = eligible.map(circleWeight);
		return weightedRandomChoice(eligible, weights);
	}

	// Exploit: only active circles, weighted by capacity-aware score.
	if (activeCircles.length === 0) {
		// Fallback: no active circles, pick from all eligible by circleWeight.
		const weights = eligible.map(circleWeight);
		return weightedRandomChoice(eligible, weights);
	}

	const weights = activeCircles.map(circleWeight);
	return weightedRandomChoice(activeCircles, weights);
}

export function selectCircleForOrderAsync(
	circles: readonly CircleForRouting[],
	orderCurrency: string,
	validateCircle: (circleId: bigint) => ResultAsync<boolean, unknown>,
	logger: Logger = noopLogger,
): ResultAsync<bigint, OrderRoutingError> {
	const eligible = filterEligibleCircles(circles, orderCurrency);
	let remaining = [...eligible];

	logger.debug("filtering eligible circles", {
		total: circles.length,
		eligible: eligible.length,
		currency: orderCurrency,
		circles: eligible,
	});

	if (eligible.length === 0) {
		logger.warn("no eligible circles found for currency", { currency: orderCurrency });
	}

	function attempt(attemptsLeft: number): ResultAsync<bigint, OrderRoutingError> {
		if (attemptsLeft <= 0 || remaining.length === 0) {
			logger.warn("exhausted all attempts or circles", {
				attemptsLeft,
				remainingCircles: remaining.length,
			});
			return errAsync(
				new OrderRoutingError("No eligible circles found", {
					code: "NO_ELIGIBLE_CIRCLES",
				}),
			);
		}

		const selected = selectCircle(remaining);
		if (!selected) {
			return errAsync(
				new OrderRoutingError("No eligible circles found", {
					code: "NO_ELIGIBLE_CIRCLES",
				}),
			);
		}

		const circleId = BigInt(selected.circleId);

		logger.debug("selected circle, validating on-chain", {
			circleId: String(circleId),
			status: selected.metrics.circleStatus,
			score: selected.metrics.circleScore,
			attemptsLeft,
		});

		return validateCircle(circleId)
			.orElse((error) => {
				logger.warn("validation errored, treating as ineligible", {
					circleId: String(circleId),
					error: String(error),
				});
				return okAsync(false);
			})
			.andThen((isValid) => {
				if (isValid) {
					logger.info("circle validated successfully", { circleId: String(circleId) });
					return okAsync(circleId);
				}
				logger.debug("circle failed validation, retrying", {
					circleId: String(circleId),
					remainingCircles: remaining.length - 1,
				});
				remaining = remaining.filter((c) => c.circleId !== selected.circleId);
				return attempt(attemptsLeft - 1);
			});
	}

	return attempt(MAX_VALIDATION_ATTEMPTS);
}
