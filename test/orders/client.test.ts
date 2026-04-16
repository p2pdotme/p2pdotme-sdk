import { describe, expect, it, vi } from "vitest";
import { createOrders } from "../../src/orders";
import { createInMemoryRelayStore } from "../../src/orders/relay-identity";

const DIAMOND = "0x0000000000000000000000000000000000000001" as const;
const USDC = "0x0000000000000000000000000000000000000002" as const;

describe("createOrders", () => {
	it("exposes read + write + allowance helpers on a flat surface", () => {
		const client = createOrders({
			publicClient: { readContract: vi.fn() } as never,
			diamondAddress: DIAMOND,
			usdcAddress: USDC,
			subgraphUrl: "https://example.invalid/subgraph",
			relayIdentityStore: createInMemoryRelayStore(),
		});

		// Reads
		expect(typeof client.getOrder).toBe("function");
		expect(typeof client.getOrders).toBe("function");
		expect(typeof client.getFeeConfig).toBe("function");
		expect(typeof client.readUsdcAllowance).toBe("function");

		// Writes (layered prepare/execute)
		expect(typeof client.placeOrder.prepare).toBe("function");
		expect(typeof client.placeOrder.execute).toBe("function");
		expect(typeof client.cancelOrder.prepare).toBe("function");
		expect(typeof client.cancelOrder.execute).toBe("function");
		expect(typeof client.setSellOrderUpi.prepare).toBe("function");
		expect(typeof client.setSellOrderUpi.execute).toBe("function");
		expect(typeof client.raiseDispute.prepare).toBe("function");
		expect(typeof client.raiseDispute.execute).toBe("function");
		expect(typeof client.approveUsdc.prepare).toBe("function");
		expect(typeof client.approveUsdc.execute).toBe("function");
	});

	it("factory construction works without a relayIdentityStore (defaults to in-memory)", () => {
		expect(() =>
			createOrders({
				publicClient: { readContract: vi.fn() } as never,
				diamondAddress: DIAMOND,
				usdcAddress: USDC,
				subgraphUrl: "https://example.invalid/subgraph",
			}),
		).not.toThrow();
	});
});
