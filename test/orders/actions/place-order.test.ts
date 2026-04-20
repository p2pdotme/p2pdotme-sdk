import { describe, expect, it, vi } from "vitest";
import {
	decodeFunctionData,
	encodeAbiParameters,
	encodeEventTopics,
	parseUnits,
	zeroAddress,
} from "viem";
import { okAsync } from "neverthrow";
import { ABIS } from "../../../src/contracts/abis";
import { createPlaceOrderAction } from "../../../src/orders/actions/place-order";
import {
	createInMemoryRelayStore,
	createRelayIdentity,
} from "../../../src/orders/relay-identity";
import { ZodCurrencySchema } from "../../../src/validation";

const DIAMOND = "0x000000000000000000000000000000000000beef" as const;
const USER = "0x0000000000000000000000000000000000000001" as const;
const CURRENCY = ZodCurrencySchema.parse("INR");

function makeOrderRouter() {
	return {
		selectCircle: vi.fn().mockReturnValue(okAsync(77n)),
		getCircles: vi.fn(),
	} as never;
}

describe("placeOrder.prepare (BUY)", () => {
	it("selects a circle, resolves identity, encodes placeOrder", async () => {
		const orderRouter = makeOrderRouter();
		const action = createPlaceOrderAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			orderRouter,
			relayIdentityStore: createInMemoryRelayStore(),
		});

		const result = await action.prepare({
			orderType: 0,
			currency: CURRENCY,
			user: USER,
			amount: parseUnits("10", 6),
			fiatAmount: parseUnits("830", 6),
			fiatAmountLimit: parseUnits("900", 6),
			recipientAddr: USER,
		});
		expect(result.isOk()).toBe(true);
		const tx = result._unsafeUnwrap();
		expect(tx.to).toBe(DIAMOND);
		expect(tx.meta?.circleId).toBe(77n);
		expect(tx.meta?.relayIdentity).toBeDefined();

		const decoded = decodeFunctionData({ abi: ABIS.FACETS.ORDER_FLOW, data: tx.data });
		expect(decoded.functionName).toBe("placeOrder");
		// _pubKey is the relay public key for BUY; _userPubKey must be empty
		expect(decoded.args[0]).toBe(tx.meta?.relayIdentity?.publicKey);
		expect(decoded.args[5]).toBe("");
	});
});

describe("placeOrder.prepare (SELL)", () => {
	it("swaps pubKey slots — _pubKey empty, _userPubKey = relay", async () => {
		const orderRouter = makeOrderRouter();
		const action = createPlaceOrderAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			orderRouter,
			relayIdentityStore: createInMemoryRelayStore(),
		});

		const result = await action.prepare({
			orderType: 1,
			currency: CURRENCY,
			user: USER,
			amount: parseUnits("10", 6),
			fiatAmount: parseUnits("830", 6),
			fiatAmountLimit: 0n,
			recipientAddr: USER,
		});
		expect(result.isOk()).toBe(true);
		const tx = result._unsafeUnwrap();
		const decoded = decodeFunctionData({ abi: ABIS.FACETS.ORDER_FLOW, data: tx.data });
		expect(decoded.args[0]).toBe("");
		expect(decoded.args[5]).toBe(tx.meta?.relayIdentity?.publicKey);
	});
});

describe("placeOrder.prepare — circle selection failure", () => {
	it("surfaces CIRCLE_SELECTION_FAILED", async () => {
		const { errAsync } = await import("neverthrow");
		const orderRouter = {
			selectCircle: vi.fn().mockReturnValue(errAsync(new Error("no circles"))),
			getCircles: vi.fn(),
		} as never;
		const action = createPlaceOrderAction({
			publicClient: {} as never,
			diamondAddress: DIAMOND,
			orderRouter,
			relayIdentityStore: createInMemoryRelayStore(),
		});
		const result = await action.prepare({
			orderType: 0,
			currency: CURRENCY,
			user: USER,
			amount: parseUnits("10", 6),
			fiatAmount: parseUnits("830", 6),
			fiatAmountLimit: 0n,
			recipientAddr: USER,
		});
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("CIRCLE_SELECTION_FAILED");
	});
});

describe("placeOrder.execute — orderId extraction from receipt", () => {
	// Build a synthetic OrderPlaced log via the same ABI the action uses.
	function makeOrderPlacedLog(orderId: bigint, userAddress: `0x${string}`) {
		const topics = encodeEventTopics({
			abi: ABIS.FACETS.ORDER_FLOW,
			eventName: "OrderPlaced",
			args: { orderId, user: userAddress, merchant: zeroAddress },
		});
		const orderStructType = {
			type: "tuple",
			components: [
				{ name: "amount", type: "uint256" },
				{ name: "fiatAmount", type: "uint256" },
				{ name: "placedTimestamp", type: "uint256" },
				{ name: "completedTimestamp", type: "uint256" },
				{ name: "userCompletedTimestamp", type: "uint256" },
				{ name: "acceptedMerchant", type: "address" },
				{ name: "user", type: "address" },
				{ name: "recipientAddr", type: "address" },
				{ name: "pubkey", type: "string" },
				{ name: "encUpi", type: "string" },
				{ name: "userCompleted", type: "bool" },
				{ name: "status", type: "uint8" },
				{ name: "orderType", type: "uint8" },
				{
					name: "disputeInfo",
					type: "tuple",
					components: [
						{ name: "raisedBy", type: "uint8" },
						{ name: "status", type: "uint8" },
						{ name: "redactTransId", type: "uint256" },
						{ name: "accountNumber", type: "uint256" },
					],
				},
				{ name: "id", type: "uint256" },
				{ name: "userPubKey", type: "string" },
				{ name: "encMerchantUpi", type: "string" },
				{ name: "acceptedAccountNo", type: "uint256" },
				{ name: "assignedAccountNos", type: "uint256[]" },
				{ name: "currency", type: "bytes32" },
				{ name: "preferredPaymentChannelConfigId", type: "uint256" },
				{ name: "circleId", type: "uint256" },
			],
		} as const;
		const data = encodeAbiParameters(
			[
				{ name: "amount", type: "uint256" },
				{ name: "orderType", type: "uint8" },
				{ name: "placedTimestamp", type: "uint256" },
				orderStructType,
			],
			[
				1_000_000n,
				0,
				1_700_000_000n,
				{
					amount: 0n,
					fiatAmount: 0n,
					placedTimestamp: 0n,
					completedTimestamp: 0n,
					userCompletedTimestamp: 0n,
					acceptedMerchant: zeroAddress,
					user: zeroAddress,
					recipientAddr: zeroAddress,
					pubkey: "",
					encUpi: "",
					userCompleted: false,
					status: 0,
					orderType: 0,
					disputeInfo: {
						raisedBy: 0,
						status: 0,
						redactTransId: 0n,
						accountNumber: 0n,
					},
					id: 0n,
					userPubKey: "",
					encMerchantUpi: "",
					acceptedAccountNo: 0n,
					assignedAccountNos: [],
					currency: `0x${"00".repeat(32)}` as `0x${string}`,
					preferredPaymentChannelConfigId: 0n,
					circleId: 0n,
				},
			],
		);
		return {
			address: DIAMOND,
			topics,
			data,
			blockNumber: 1n,
			blockHash: `0x${"00".repeat(32)}` as `0x${string}`,
			transactionHash: `0x${"11".repeat(32)}` as `0x${string}`,
			transactionIndex: 0,
			logIndex: 0,
			removed: false,
		};
	}

	it("populates meta.orderId from the OrderPlaced event when waiting for receipt", async () => {
		const orderId = 9001n;
		const log = makeOrderPlacedLog(orderId, USER);
		const publicClient = {
			readContract: vi.fn(),
			waitForTransactionReceipt: vi.fn().mockResolvedValue({
				status: "success",
				blockNumber: 1n,
				logs: [log],
			}),
		} as never;
		const walletClient = {
			account: { address: USER },
			chain: undefined,
			sendTransaction: vi.fn().mockResolvedValue("0xhash"),
		} as never;
		const action = createPlaceOrderAction({
			publicClient,
			diamondAddress: DIAMOND,
			orderRouter: makeOrderRouter(),
			relayIdentityStore: createInMemoryRelayStore(),
		});

		const result = await action.execute({
			walletClient,
			waitForReceipt: true,
			orderType: 0,
			currency: CURRENCY,
			user: USER,
			amount: parseUnits("10", 6),
			fiatAmount: parseUnits("830", 6),
			fiatAmountLimit: 0n,
			recipientAddr: USER,
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().meta?.orderId).toBe(orderId);
	});

	it("leaves meta.orderId undefined when receipt has no OrderPlaced log", async () => {
		const publicClient = {
			readContract: vi.fn(),
			waitForTransactionReceipt: vi
				.fn()
				.mockResolvedValue({ status: "success", blockNumber: 1n, logs: [] }),
		} as never;
		const walletClient = {
			account: { address: USER },
			chain: undefined,
			sendTransaction: vi.fn().mockResolvedValue("0xhash"),
		} as never;
		const action = createPlaceOrderAction({
			publicClient,
			diamondAddress: DIAMOND,
			orderRouter: makeOrderRouter(),
			relayIdentityStore: createInMemoryRelayStore(),
		});

		const result = await action.execute({
			walletClient,
			waitForReceipt: true,
			orderType: 0,
			currency: CURRENCY,
			user: USER,
			amount: parseUnits("10", 6),
			fiatAmount: parseUnits("830", 6),
			fiatAmountLimit: 0n,
			recipientAddr: USER,
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().meta?.orderId).toBeUndefined();
	});

	it("leaves meta.orderId undefined when waitForReceipt is not set", async () => {
		const publicClient = {
			readContract: vi.fn(),
			waitForTransactionReceipt: vi.fn(),
		} as never;
		const walletClient = {
			account: { address: USER },
			chain: undefined,
			sendTransaction: vi.fn().mockResolvedValue("0xhash"),
		} as never;
		const action = createPlaceOrderAction({
			publicClient,
			diamondAddress: DIAMOND,
			orderRouter: makeOrderRouter(),
			relayIdentityStore: createInMemoryRelayStore(),
		});

		const result = await action.execute({
			walletClient,
			// no waitForReceipt → no logs to parse
			orderType: 0,
			currency: CURRENCY,
			user: USER,
			amount: parseUnits("10", 6),
			fiatAmount: parseUnits("830", 6),
			fiatAmountLimit: 0n,
			recipientAddr: USER,
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().meta?.orderId).toBeUndefined();
	});
});

// Ensure createRelayIdentity is kept in scope (used by relay-identity branch tests elsewhere).
void createRelayIdentity;
