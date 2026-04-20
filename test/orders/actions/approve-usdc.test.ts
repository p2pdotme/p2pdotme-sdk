import { describe, expect, it } from "vitest";
import { decodeFunctionData, erc20Abi, getAddress } from "viem";
import { createApproveUsdcAction } from "../../../src/orders/actions/approve-usdc";

const DIAMOND = "0x000000000000000000000000000000000000beef" as const;
const USDC = "0x000000000000000000000000000000000000cafe" as const;

describe("approveUsdc.prepare", () => {
	it("encodes IERC20.approve(diamond, amount) to USDC address", async () => {
		const action = createApproveUsdcAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			usdcAddress: USDC,
		});
		const result = await action.prepare({ amount: 1_000_000n });
		expect(result.isOk()).toBe(true);
		const tx = result._unsafeUnwrap();
		expect(tx.to).toBe(USDC);
		const decoded = decodeFunctionData({ abi: erc20Abi, data: tx.data });
		expect(decoded.functionName).toBe("approve");
		expect(decoded.args).toEqual([getAddress(DIAMOND), 1_000_000n]);
	});
});
