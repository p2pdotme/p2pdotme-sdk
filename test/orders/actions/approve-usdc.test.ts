import { describe, expect, it, vi } from "vitest";
import { decodeFunctionData, erc20Abi, getAddress } from "viem";
import {
	createApproveUsdcAction,
	readUsdcAllowance,
} from "../../../src/orders/actions/approve-usdc";

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

describe("readUsdcAllowance", () => {
	it("reads allowance(owner, diamond) from USDC", async () => {
		const readContract = vi.fn().mockResolvedValue(42n);
		const publicClient = { readContract } as never;
		const owner = "0x0000000000000000000000000000000000000001" as const;
		const result = await readUsdcAllowance({
			publicClient,
			usdcAddress: USDC,
			diamondAddress: DIAMOND,
			params: { owner },
		});
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBe(42n);
		expect(readContract).toHaveBeenCalledWith({
			address: USDC,
			abi: erc20Abi,
			functionName: "allowance",
			args: [owner, DIAMOND],
		});
	});

	it("maps readContract failure to ALLOWANCE_READ_FAILED", async () => {
		const readContract = vi.fn().mockRejectedValue(new Error("rpc down"));
		const publicClient = { readContract } as never;
		const result = await readUsdcAllowance({
			publicClient,
			usdcAddress: USDC,
			diamondAddress: DIAMOND,
			params: { owner: "0x0000000000000000000000000000000000000001" },
		});
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("ALLOWANCE_READ_FAILED");
	});
});
