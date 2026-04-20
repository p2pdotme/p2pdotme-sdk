import { describe, expect, it, vi } from "vitest";
import { decodeFunctionData } from "viem";
import { ABIS } from "../../../src/contracts/abis";
import { createRaiseDisputeAction } from "../../../src/orders/actions/raise-dispute";

const DIAMOND = "0x000000000000000000000000000000000000beef" as const;

describe("raiseDispute.prepare", () => {
	const action = createRaiseDisputeAction({
		publicClient: {} as never,
		diamondAddress: DIAMOND,
	});

	it("encodes raiseDispute(orderId, redactTransId)", async () => {
		const result = await action.prepare({ orderId: 7n, redactTransId: 999n });
		expect(result.isOk()).toBe(true);
		const tx = result._unsafeUnwrap();
		const decoded = decodeFunctionData({
			abi: ABIS.FACETS.ORDER_PROCESSOR,
			data: tx.data,
		});
		expect(decoded.functionName).toBe("raiseDispute");
		expect(decoded.args).toEqual([7n, 999n]);
	});
});

describe("raiseDispute.execute", () => {
	it("submits with the correct calldata", async () => {
		const sendTransaction = vi.fn().mockResolvedValue("0xhash");
		const walletClient = {
			account: { address: "0x0000000000000000000000000000000000000001" },
			chain: undefined,
			sendTransaction,
		} as never;
		const action = createRaiseDisputeAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
		});

		const result = await action.execute({
			walletClient,
			orderId: 1n,
			redactTransId: 0n,
		});
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().hash).toBe("0xhash");
	});
});
