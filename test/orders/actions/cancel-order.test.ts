import { describe, expect, it, vi } from "vitest";
import { decodeFunctionData } from "viem";
import { ABIS } from "../../../src/contracts/abis";
import { createCancelOrderAction } from "../../../src/orders/actions/cancel-order";

const DIAMOND = "0x000000000000000000000000000000000000beef" as const;

describe("cancelOrder.prepare", () => {
	const action = createCancelOrderAction({
		publicClient: {} as never,
		diamondAddress: DIAMOND,
	});

	it("returns to/data/value that decode to cancelOrder(orderId)", async () => {
		const result = await action.prepare({ orderId: 42n });
		expect(result.isOk()).toBe(true);
		const tx = result._unsafeUnwrap();
		expect(tx.to).toBe(DIAMOND);
		expect(tx.value).toBe(0n);
		const decoded = decodeFunctionData({ abi: ABIS.FACETS.ORDER_FLOW, data: tx.data });
		expect(decoded.functionName).toBe("cancelOrder");
		expect(decoded.args).toEqual([42n]);
	});

	it("rejects negative orderId with VALIDATION_ERROR", async () => {
		const result = await action.prepare({ orderId: -1n });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
	});
});

describe("cancelOrder.execute", () => {
	it("submits the prepared tx and returns the hash", async () => {
		const sendTransaction = vi.fn().mockResolvedValue("0xhash");
		const walletClient = {
			account: { address: "0x0000000000000000000000000000000000000001" },
			chain: undefined,
			sendTransaction,
		} as never;
		const action = createCancelOrderAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
		});

		const result = await action.execute({ walletClient, orderId: 42n });
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().hash).toBe("0xhash");
		expect(sendTransaction).toHaveBeenCalledOnce();
		const args = sendTransaction.mock.calls[0]?.[0];
		expect(args.to).toBe(DIAMOND);
	});

	it("maps sendTransaction rejection to TX_SUBMISSION_FAILED", async () => {
		const walletClient = {
			account: { address: "0x0000000000000000000000000000000000000001" },
			chain: undefined,
			sendTransaction: vi.fn().mockRejectedValue(new Error("user rejected")),
		} as never;
		const action = createCancelOrderAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
		});

		const result = await action.execute({ walletClient, orderId: 42n });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("TX_SUBMISSION_FAILED");
	});
});
