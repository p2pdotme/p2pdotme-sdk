import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import {
	circleWeight,
	filterEligibleCircles,
	selectCircle,
	selectCircleForOrderAsync,
} from "../../../../src/orders/internal/routing/routing";
import type { CircleForRouting } from "../../../../src/orders/internal/routing/types";

// ── Helpers ─────────────────────────────────────────────────────────────

type CircleOverrides = {
	circleId: string;
	currency?: string;
	metrics?: {
		circleScore?: number;
		circleStatus?: string;
		scoreState?: {
			activeMerchantsCount?: number;
			availableMerchantsCount?: number;
		};
	};
};

function makeCircle(overrides: CircleOverrides): CircleForRouting {
	const active = overrides.metrics?.scoreState?.activeMerchantsCount ?? 5;
	return {
		circleId: overrides.circleId,
		currency: overrides.currency ?? "INR",
		metrics: {
			circleScore: overrides.metrics?.circleScore ?? 100,
			circleStatus: overrides.metrics?.circleStatus ?? "active",
			scoreState: {
				activeMerchantsCount: active,
				// Default availableMerchantsCount to activeMerchantsCount so
				// pre-existing fixtures keep working; tests that need them to
				// differ can override explicitly.
				availableMerchantsCount:
					overrides.metrics?.scoreState?.availableMerchantsCount ?? active,
			},
		},
	};
}

/** Seed Math.random to return values from a fixed sequence. */
function seedRandom(values: number[]) {
	let i = 0;
	return vi.spyOn(Math, "random").mockImplementation(() => {
		const val = values[i % values.length];
		i++;
		return val;
	});
}

// ── circleWeight ────────────────────────────────────────────────────────

describe("circleWeight", () => {
	it("multiplies score by availableMerchantsCount for active circles", () => {
		const circle = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 80,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 3, availableMerchantsCount: 3 },
			},
		});
		expect(circleWeight(circle)).toBe(80 * 3);
	});

	it("caps bootstrap base at 25 before multiplying by capacity", () => {
		const circle = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 50,
				circleStatus: "bootstrap",
				scoreState: { activeMerchantsCount: 4, availableMerchantsCount: 4 },
			},
		});
		// base = min(50, 25) = 25; weight = 25 × 4
		expect(circleWeight(circle)).toBe(25 * 4);
	});

	it("uses raw score for bootstrap circles when score < 25", () => {
		const circle = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 10,
				circleStatus: "bootstrap",
				scoreState: { activeMerchantsCount: 2, availableMerchantsCount: 2 },
			},
		});
		expect(circleWeight(circle)).toBe(10 * 2);
	});

	it("scales paused base by 0.3 before multiplying by capacity", () => {
		const circle = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 100,
				circleStatus: "paused",
				scoreState: { activeMerchantsCount: 2, availableMerchantsCount: 2 },
			},
		});
		// base = 100 × 0.3 = 30; weight = 30 × 2
		expect(circleWeight(circle)).toBeCloseTo(60);
	});

	it("treats unknown status as raw score base", () => {
		const circle = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 60,
				circleStatus: "unknown",
				scoreState: { activeMerchantsCount: 4, availableMerchantsCount: 4 },
			},
		});
		expect(circleWeight(circle)).toBe(60 * 4);
	});

	it("returns zero when availableMerchantsCount is zero, regardless of score", () => {
		const circle = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 90,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 5, availableMerchantsCount: 0 },
			},
		});
		expect(circleWeight(circle)).toBe(0);
	});

	it("handles zero score", () => {
		const circle = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 0,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 5, availableMerchantsCount: 5 },
			},
		});
		expect(circleWeight(circle)).toBe(0);
	});

	it("equalizes per-merchant load ratio to score ratio", () => {
		// Per-merchant load = weight / availableMerchantsCount = base score.
		// So the ratio of per-merchant loads between two active circles
		// equals their score ratio, independent of merchant pool sizes.
		const big = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 50,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 20, availableMerchantsCount: 20 },
			},
		});
		const small = makeCircle({
			circleId: "2",
			metrics: {
				circleScore: 80,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 5, availableMerchantsCount: 5 },
			},
		});
		const bigPerMerchant = circleWeight(big) / big.metrics.scoreState.availableMerchantsCount;
		const smallPerMerchant = circleWeight(small) / small.metrics.scoreState.availableMerchantsCount;
		expect(smallPerMerchant / bigPerMerchant).toBeCloseTo(80 / 50);
	});
});

// ── filterEligibleCircles ───────────────────────────────────────────────

describe("filterEligibleCircles", () => {
	const circles = [
		makeCircle({ circleId: "1", currency: "INR" }),
		makeCircle({ circleId: "2", currency: "BRL" }),
		makeCircle({ circleId: "3", currency: "inr" }),
		makeCircle({ circleId: "4", currency: "IDR" }),
	];

	it("filters by currency (case-insensitive)", () => {
		const result = filterEligibleCircles(circles, "INR");
		expect(result.map((c) => c.circleId)).toEqual(["1", "3"]);
	});

	it("returns empty for no matches", () => {
		expect(filterEligibleCircles(circles, "USD")).toEqual([]);
	});

	it("returns empty for empty input", () => {
		expect(filterEligibleCircles([], "INR")).toEqual([]);
	});

	it("excludes circles with zero availableMerchantsCount", () => {
		const withCap = makeCircle({
			circleId: "1",
			currency: "INR",
			metrics: { scoreState: { activeMerchantsCount: 4, availableMerchantsCount: 4 } },
		});
		const withoutCap = makeCircle({
			circleId: "2",
			currency: "INR",
			metrics: { scoreState: { activeMerchantsCount: 4, availableMerchantsCount: 0 } },
		});
		const result = filterEligibleCircles([withCap, withoutCap], "INR");
		expect(result.map((c) => c.circleId)).toEqual(["1"]);
	});
});

// ── selectCircle ────────────────────────────────────────────────────────

describe("selectCircle", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null for empty array", () => {
		expect(selectCircle([])).toBeNull();
	});

	it("returns the only circle when there is one", () => {
		const circle = makeCircle({ circleId: "1" });
		seedRandom([0.5]); // exploit path, doesn't matter — only one circle
		expect(selectCircle([circle])).toBe(circle);
	});

	it("exploits: picks from active circles only (Math.random >= 0.25)", () => {
		const active = makeCircle({
			circleId: "1",
			metrics: { circleScore: 100, circleStatus: "active", scoreState: { activeMerchantsCount: 5 } },
		});
		const paused = makeCircle({
			circleId: "2",
			metrics: { circleScore: 100, circleStatus: "paused", scoreState: { activeMerchantsCount: 2 } },
		});
		const bootstrap = makeCircle({
			circleId: "3",
			metrics: { circleScore: 100, circleStatus: "bootstrap", scoreState: { activeMerchantsCount: 1 } },
		});

		// First random >= 0.25 → exploit; second random picks from active only
		seedRandom([0.5, 0.0]);
		const result = selectCircle([active, paused, bootstrap]);
		expect(result).toBe(active);
	});

	it("explores: picks from all eligible circles (BOOTSTRAP_RESERVE <= r < 0.35)", () => {
		const active = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 100,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 5, availableMerchantsCount: 5 },
			},
		});
		const paused = makeCircle({
			circleId: "2",
			metrics: {
				circleScore: 100,
				circleStatus: "paused",
				scoreState: { activeMerchantsCount: 2, availableMerchantsCount: 2 },
			},
		});

		// r=0.1: not in reserve (0.1 < 0.1 is false), 0.1 < 0.35 → explore.
		// Capacity-aware weights: active=100×5=500, paused=30×2=60 → total=560.
		// Second random 0.9 → rand = 0.9 × 560 = 504. 504-500=4, 4-60=-56 → paused.
		seedRandom([0.1, 0.9]);
		const result = selectCircle([active, paused]);
		expect(result).toBe(paused);
	});

	it("exploit falls back to all eligible when no active circles exist", () => {
		const paused = makeCircle({
			circleId: "1",
			metrics: { circleScore: 100, circleStatus: "paused", scoreState: { activeMerchantsCount: 2 } },
		});
		const bootstrap = makeCircle({
			circleId: "2",
			metrics: { circleScore: 50, circleStatus: "bootstrap", scoreState: { activeMerchantsCount: 1 } },
		});

		// First random >= 0.25 → exploit path, but no active circles → fallback
		seedRandom([0.5, 0.0]);
		const result = selectCircle([paused, bootstrap]);
		expect(result).not.toBeNull();
		expect([paused, bootstrap]).toContain(result);
	});

	it("higher-scored circles are selected more often in exploit mode", () => {
		const highScore = makeCircle({
			circleId: "1",
			metrics: { circleScore: 900, circleStatus: "active", scoreState: { activeMerchantsCount: 10 } },
		});
		const lowScore = makeCircle({
			circleId: "2",
			metrics: { circleScore: 100, circleStatus: "active", scoreState: { activeMerchantsCount: 1 } },
		});

		vi.restoreAllMocks();
		const counts: Record<string, number> = { "1": 0, "2": 0 };
		for (let i = 0; i < 1000; i++) {
			const result = selectCircle([highScore, lowScore]);
			if (result) counts[result.circleId]++;
		}

		// highScore (900) should be picked ~90% of the time
		expect(counts["1"]).toBeGreaterThan(counts["2"] * 2);
	});

	it("bootstrap reserve: picks only from bootstrap circles when r < 0.1", () => {
		const active = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 900,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 10, availableMerchantsCount: 10 },
			},
		});
		const bootstrap = makeCircle({
			circleId: "2",
			metrics: {
				circleScore: 20,
				circleStatus: "bootstrap",
				scoreState: { activeMerchantsCount: 1, availableMerchantsCount: 1 },
			},
		});

		// r=0.05 → bootstrap reserve branch.
		// Even though active has weight 9000 vs bootstrap 20, reserve picks
		// from bootstrap-only.
		seedRandom([0.05, 0.0]);
		const result = selectCircle([active, bootstrap]);
		expect(result).toBe(bootstrap);
	});

	it("bootstrap reserve falls through to e-greedy when no bootstrap circles exist", () => {
		const active = makeCircle({
			circleId: "1",
			metrics: {
				circleScore: 100,
				circleStatus: "active",
				scoreState: { activeMerchantsCount: 5, availableMerchantsCount: 5 },
			},
		});

		// r=0.05 — would hit reserve, but no bootstrap circles → falls through.
		// 0.05 < 0.35 → explore branch over active alone.
		seedRandom([0.05, 0.0]);
		const result = selectCircle([active]);
		expect(result).toBe(active);
	});
});

// ── selectCircleForOrderAsync ───────────────────────────────────────────

describe("selectCircleForOrderAsync", () => {
	beforeEach(() => {
		// Force exploit mode (Math.random >= 0.25) for deterministic tests
		seedRandom([0.5, 0.0]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns circleId when validation passes on first attempt", async () => {
		const circles = [makeCircle({ circleId: "42", currency: "INR" })];
		const validate = vi.fn(() => okAsync(true));

		const result = await selectCircleForOrderAsync(circles, "INR", validate);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBe(42n);
		expect(validate).toHaveBeenCalledTimes(1);
	});

	it("retries on validation failure and picks another circle", async () => {
		const c1 = makeCircle({ circleId: "1", currency: "INR" });
		const c2 = makeCircle({ circleId: "2", currency: "INR" });

		const validate = vi.fn()
			.mockReturnValueOnce(okAsync(false)) // c1 fails
			.mockReturnValueOnce(okAsync(true)); // c2 passes

		const result = await selectCircleForOrderAsync([c1, c2], "INR", validate);

		expect(result.isOk()).toBe(true);
		expect(validate).toHaveBeenCalledTimes(2);
	});

	it("treats validation errors as ineligible and retries", async () => {
		const c1 = makeCircle({ circleId: "1", currency: "INR" });
		const c2 = makeCircle({ circleId: "2", currency: "INR" });

		const validate = vi.fn()
			.mockReturnValueOnce(errAsync(new Error("RPC error")))
			.mockReturnValueOnce(okAsync(true));

		const result = await selectCircleForOrderAsync([c1, c2], "INR", validate);

		expect(result.isOk()).toBe(true);
		expect(validate).toHaveBeenCalledTimes(2);
	});

	it("returns NO_ELIGIBLE_CIRCLES after exhausting MAX_VALIDATION_ATTEMPTS", async () => {
		const circles = [
			makeCircle({ circleId: "1", currency: "INR" }),
			makeCircle({ circleId: "2", currency: "INR" }),
			makeCircle({ circleId: "3", currency: "INR" }),
		];
		const validate = vi.fn(() => okAsync(false));

		const result = await selectCircleForOrderAsync(circles, "INR", validate);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("NO_ELIGIBLE_CIRCLES");
		expect(validate).toHaveBeenCalledTimes(3); // MAX_VALIDATION_ATTEMPTS = 3
	});

	it("returns NO_ELIGIBLE_CIRCLES when no circles match currency", async () => {
		const circles = [makeCircle({ circleId: "1", currency: "BRL" })];
		const validate = vi.fn(() => okAsync(true));

		const result = await selectCircleForOrderAsync(circles, "INR", validate);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("NO_ELIGIBLE_CIRCLES");
		expect(validate).not.toHaveBeenCalled();
	});

	it("returns NO_ELIGIBLE_CIRCLES for empty circles array", async () => {
		const validate = vi.fn(() => okAsync(true));

		const result = await selectCircleForOrderAsync([], "INR", validate);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("NO_ELIGIBLE_CIRCLES");
	});

	it("removes failed circle from pool before retrying", async () => {
		const c1 = makeCircle({
			circleId: "1",
			currency: "INR",
			metrics: { circleScore: 1000, circleStatus: "active", scoreState: { activeMerchantsCount: 10 } },
		});
		const c2 = makeCircle({
			circleId: "2",
			currency: "INR",
			metrics: { circleScore: 1, circleStatus: "active", scoreState: { activeMerchantsCount: 1 } },
		});

		const validate = vi.fn()
			.mockReturnValueOnce(okAsync(false)) // c1 fails (high score, picked first)
			.mockReturnValueOnce(okAsync(true)); // c2 passes (only one left)

		const result = await selectCircleForOrderAsync([c1, c2], "INR", validate);

		expect(result.isOk()).toBe(true);
		// Second call must be c2 since c1 was removed
		expect(validate).toHaveBeenNthCalledWith(2, 2n);
	});
});
