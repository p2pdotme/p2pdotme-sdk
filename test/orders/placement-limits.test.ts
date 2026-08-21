import { afterEach, describe, expect, it, vi } from "vitest";
import { stringToHex } from "viem";
import { getPlacementLimitsForUser } from "../../src/orders/subgraph";

const URL = "https://subgraph.example.com/graphql";
const USER = "0x00000000000000000000000000000000000000AB";
const NOW = 1_893_456_789; // some moment inside a UTC day
const DAY_INDEX = Math.floor(NOW / 86_400);

function jsonResponse(data: unknown) {
	return new Response(JSON.stringify({ data }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

function mockSubgraph(data: unknown) {
	return vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(data));
}

function placements(buy: string, sell: string) {
	return { dayIndex: String(DAY_INDEX), buyPlacements: buy, sellPlacements: sell };
}

function config(overrides: Record<string, unknown> = {}) {
	return {
		dailyBuyOrderPlacementLimit: "10",
		buyLimitConfigured: true,
		dailySellOrderPlacementLimit: "20",
		sellLimitConfigured: true,
		...overrides,
	};
}

describe("getPlacementLimitsForUser", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reports used, limit and remaining for both buckets", async () => {
		mockSubgraph({
			userDailyPlacements: placements("3", "18"),
			orderPlacementLimitConfig: config(),
		});

		const result = await getPlacementLimitsForUser(URL, USER, NOW);
		const limits = result._unsafeUnwrap();

		expect(limits.buy).toEqual({ used: 3, limit: 10, remaining: 7, state: "enforced" });
		expect(limits.sellPay).toEqual({ used: 18, limit: 20, remaining: 2, state: "enforced" });
		expect(limits.dayIndex).toBe(DAY_INDEX);
		expect(limits.resetsAt).toBe((DAY_INDEX + 1) * 86_400);
	});

	it("keys the day bucket the way the contract does", async () => {
		const fetchSpy = mockSubgraph({
			userDailyPlacements: null,
			orderPlacementLimitConfig: config(),
		});

		await getPlacementLimitsForUser(URL, USER, NOW);

		const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
		// Lowercased address + "-" + timestamp/86400, hex-encoded — the id the
		// subgraph builds, derived from the same day key as getDayKey on-chain.
		expect(body.variables.placementsId).toBe(
			stringToHex(`${USER.toLowerCase()}-${DAY_INDEX}`),
		);
		expect(body.variables.configId).toBe(stringToHex("placement-limits"));
	});

	it("treats a missing placement bucket as zero used", async () => {
		mockSubgraph({
			userDailyPlacements: null,
			orderPlacementLimitConfig: config(),
		});

		const limits = (await getPlacementLimitsForUser(URL, USER, NOW))._unsafeUnwrap();

		expect(limits.buy.used).toBe(0);
		expect(limits.sellPay.used).toBe(0);
		expect(limits.sellPay.remaining).toBe(20);
	});

	it("reports a zero sell/pay cap as unlimited, not as zero remaining", async () => {
		mockSubgraph({
			userDailyPlacements: placements("0", "25"),
			orderPlacementLimitConfig: config({ dailySellOrderPlacementLimit: "0" }),
		});

		const limits = (await getPlacementLimitsForUser(URL, USER, NOW))._unsafeUnwrap();

		// On-chain a zero sell cap means no cap at all, so 25 placements is fine.
		expect(limits.sellPay).toEqual({
			used: 25,
			limit: null,
			remaining: null,
			state: "unlimited",
		});
	});

	it("reports a zero buy cap as enforced, since zero blocks every buy on-chain", async () => {
		mockSubgraph({
			userDailyPlacements: placements("0", "0"),
			orderPlacementLimitConfig: config({ dailyBuyOrderPlacementLimit: "0" }),
		});

		const limits = (await getPlacementLimitsForUser(URL, USER, NOW))._unsafeUnwrap();

		expect(limits.buy).toEqual({ used: 0, limit: 0, remaining: 0, state: "enforced" });
	});

	it("reports an unobserved cap as unknown rather than guessing", async () => {
		mockSubgraph({
			userDailyPlacements: placements("1", "2"),
			orderPlacementLimitConfig: null,
		});

		const limits = (await getPlacementLimitsForUser(URL, USER, NOW))._unsafeUnwrap();

		// Nothing indexed yet — a consumer must not render a counter off this.
		expect(limits.buy.state).toBe("unknown");
		expect(limits.buy.limit).toBeNull();
		expect(limits.sellPay.state).toBe("unknown");
		expect(limits.sellPay.remaining).toBeNull();
		// Counts are still real and worth showing.
		expect(limits.buy.used).toBe(1);
		expect(limits.sellPay.used).toBe(2);
	});

	it("never reports negative remaining if the cap is lowered below current use", async () => {
		mockSubgraph({
			userDailyPlacements: placements("0", "25"),
			orderPlacementLimitConfig: config({ dailySellOrderPlacementLimit: "20" }),
		});

		const limits = (await getPlacementLimitsForUser(URL, USER, NOW))._unsafeUnwrap();

		expect(limits.sellPay.remaining).toBe(0);
	});

	it("surfaces a malformed response as a validation error", async () => {
		mockSubgraph({
			userDailyPlacements: { dayIndex: 1, buyPlacements: 3, sellPlacements: 4 },
			orderPlacementLimitConfig: config(),
		});

		const result = await getPlacementLimitsForUser(URL, USER, NOW);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("SUBGRAPH_VALIDATION_FAILED");
	});
});
