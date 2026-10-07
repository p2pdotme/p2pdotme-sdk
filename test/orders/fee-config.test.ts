import { describe, expect, it, vi } from "vitest";
import { createOrders } from "../../src/orders";

const DIAMOND = "0x0000000000000000000000000000000000000001" as const;
const USDC = "0x0000000000000000000000000000000000000002" as const;
const SUBGRAPH = "https://example.invalid/subgraph";

// Distinct sentinels so a Buy/Sell/Pay mix-up cannot pass: all four reads are
// `bigint`, so positional order is completely type-invisible and only a test
// can pin the calls to the fields.
const THRESHOLD = 10_000_000n;
const FEE_BUY = 25_000n;
const FEE_SELL = 50_000n;
const FEE_PAY = 75_000n;

const BY_FN: Record<string, bigint> = {
	getSmallOrderThreshold: THRESHOLD,
	getSmallOrderFixedFeeBuy: FEE_BUY,
	getSmallOrderFixedFeeSell: FEE_SELL,
	getSmallOrderFixedFeePay: FEE_PAY,
};

// Mirrors the live Diamond: a selector with no facet reverts with
// "Diamond: Function does not exist" (the fate of the old unified getter), and
// `revertFn` lets a test make one registered getter revert as well.
function diamondRead(functionName: string, revertFn?: string): bigint {
	if (functionName === revertFn || !(functionName in BY_FN)) {
		throw new Error("Diamond: Function does not exist");
	}
	return BY_FN[functionName];
}

function clientWith(seen: string[], mode: "multicall" | "readContract", revertFn?: string) {
	const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
		seen.push(functionName);
		return diamondRead(functionName, revertFn);
	});
	const publicClient =
		mode === "multicall"
			? {
					readContract,
					// allowFailure: false — any one failing call rejects the whole batch.
					multicall: vi.fn(
						async ({ contracts }: { contracts: { functionName: string }[] }) =>
							contracts.map((c) => {
								seen.push(c.functionName);
								return diamondRead(c.functionName, revertFn);
							}),
					),
				}
			: { readContract };

	return createOrders({
		publicClient: publicClient as never,
		diamondAddress: DIAMOND,
		usdcAddress: USDC,
		subgraphUrl: SUBGRAPH,
	});
}

describe("orders.getFeeConfig", () => {
	it.each(["multicall", "readContract"] as const)(
		"maps each per-order-type getter to its own field (%s path)",
		async (mode) => {
			const seen: string[] = [];
			const result = await clientWith(seen, mode).getFeeConfig({ currency: "INR" });

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toEqual({
				smallOrderThreshold: THRESHOLD,
				smallOrderFixedFeeBuy: FEE_BUY,
				smallOrderFixedFeeSell: FEE_SELL,
				smallOrderFixedFeePay: FEE_PAY,
			});

			// The Diamond dropped the unified getter in V22 — calling it reverts
			// with "Diamond: Function does not exist". It must never be requested.
			expect(seen).not.toContain("getSmallOrderFixedFee");
			expect(seen).toEqual([
				"getSmallOrderThreshold",
				"getSmallOrderFixedFeeBuy",
				"getSmallOrderFixedFeeSell",
				"getSmallOrderFixedFeePay",
			]);
		},
	);

	it.each(
		(["multicall", "readContract"] as const).flatMap((mode) =>
			Object.keys(BY_FN).map((fn) => [mode, fn] as const),
		),
	)("fails the whole read when %s hits a reverting %s", async (mode, fn) => {
		const result = await clientWith([], mode, fn).getFeeConfig({ currency: "INR" });

		// Never a half-filled FeeConfig: one reverting getter is a read failure.
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("CONTRACT_READ_FAILED");
	});
});
