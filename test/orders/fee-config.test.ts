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

function clientWith(seen: string[], mode: "multicall" | "readContract") {
	const readContract = vi.fn(async ({ functionName }: { functionName: string }) => {
		seen.push(functionName);
		return BY_FN[functionName];
	});
	const publicClient =
		mode === "multicall"
			? {
					readContract,
					multicall: vi.fn(
						async ({ contracts }: { contracts: { functionName: string }[] }) =>
							contracts.map((c) => {
								seen.push(c.functionName);
								return BY_FN[c.functionName];
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

	it("surfaces a contract read failure as CONTRACT_READ_FAILED", async () => {
		const client = createOrders({
			publicClient: {
				readContract: vi.fn(async () => {
					throw new Error("Diamond: Function does not exist");
				}),
			} as never,
			diamondAddress: DIAMOND,
			usdcAddress: USDC,
			subgraphUrl: SUBGRAPH,
		});

		const result = await client.getFeeConfig({ currency: "INR" });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("CONTRACT_READ_FAILED");
	});
});
