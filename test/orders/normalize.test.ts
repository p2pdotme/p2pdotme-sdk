import { describe, expect, it } from "vitest";
import { stringToHex, zeroAddress, getAddress } from "viem";
import type {
	RawContractAdditionalDetails,
	RawContractOrder,
} from "../../src/contracts/order-processor";
import { normalizeContractOrder, normalizeSubgraphOrder } from "../../src/orders/normalize";
import type { RawSubgraphOrder } from "../../src/orders/validation";

const USER = getAddress("0x1111111111111111111111111111111111111111");
const MERCHANT = getAddress("0x2222222222222222222222222222222222222222");
const RECIPIENT = getAddress("0x3333333333333333333333333333333333333333");

function makeRawOrder(overrides: Partial<RawContractOrder> = {}): RawContractOrder {
	return {
		amount: 100_000_000n,
		fiatAmount: 8_300_000_000n,
		placedTimestamp: 1_700_000_000n,
		completedTimestamp: 1_700_000_500n,
		userCompletedTimestamp: 0n,
		acceptedMerchant: MERCHANT,
		user: USER,
		recipientAddr: RECIPIENT,
		pubkey: "",
		encUpi: "",
		userCompleted: false,
		status: 0,
		orderType: 0,
		disputeInfo: { raisedBy: 0, status: 0, redactTransId: 0n, accountNumber: 0n },
		id: 42n,
		userPubKey: "",
		encMerchantUpi: "",
		acceptedAccountNo: 0n,
		assignedAccountNos: [],
		currency: stringToHex("INR", { size: 32 }),
		preferredPaymentChannelConfigId: 0n,
		circleId: 7n,
		...overrides,
	};
}

function makeRawDetails(
	overrides: Partial<RawContractAdditionalDetails> = {},
): RawContractAdditionalDetails {
	return {
		fixedFeePaid: 100n,
		tipsPaid: 50n,
		acceptedTimestamp: 1_700_000_100n,
		paidTimestamp: 1_700_000_200n,
		reserved2: 0n,
		actualUsdtAmount: 99_000_000n,
		actualFiatAmount: 8_200_000_000n,
		...overrides,
	};
}

describe("normalizeContractOrder", () => {
	it("returns null for a zeroed struct (order not found)", () => {
		const raw = makeRawOrder({ id: 0n, user: zeroAddress });
		const result = normalizeContractOrder(raw, makeRawDetails());
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBeNull();
	});

	it("maps enum indices to string literals", () => {
		const raw = makeRawOrder({
			orderType: 2,
			status: 3,
			disputeInfo: { raisedBy: 0, status: 2, redactTransId: 0n, accountNumber: 0n },
		});
		const normalized = normalizeContractOrder(raw, makeRawDetails())._unsafeUnwrap();
		expect(normalized).not.toBeNull();
		expect(normalized!.type).toBe("pay");
		expect(normalized!.status).toBe("completed");
		expect(normalized!.disputeStatus).toBe("resolved");
	});

	it("decodes the bytes32 currency and merges both structs", () => {
		const raw = makeRawOrder();
		const details = makeRawDetails();
		const normalized = normalizeContractOrder(raw, details)._unsafeUnwrap();

		expect(normalized).toMatchObject({
			orderId: 42n,
			type: "buy",
			status: "placed",
			usdcAmount: 100_000_000n,
			actualUsdcAmount: 99_000_000n,
			currency: "INR",
			user: USER,
			recipient: RECIPIENT,
			acceptedMerchant: MERCHANT,
			placedAt: 1_700_000_000n,
			acceptedAt: 1_700_000_100n,
			paidAt: 1_700_000_200n,
			completedAt: 1_700_000_500n,
			circleId: 7n,
			fixedFeePaid: 100n,
			tipsPaid: 50n,
			disputeStatus: "none",
		});
	});

	it("errs MALFORMED_ORDER when orderType is out of range", () => {
		const raw = makeRawOrder({ orderType: 99 });
		const result = normalizeContractOrder(raw, makeRawDetails());
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("MALFORMED_ORDER");
	});

	it("errs MALFORMED_ORDER when status is out of range", () => {
		const raw = makeRawOrder({ status: 99 });
		expect(normalizeContractOrder(raw, makeRawDetails())._unsafeUnwrapErr().code).toBe(
			"MALFORMED_ORDER",
		);
	});

	it("errs MALFORMED_ORDER when disputeStatus is out of range", () => {
		const raw = makeRawOrder({
			disputeInfo: { raisedBy: 0, status: 99, redactTransId: 0n, accountNumber: 0n },
		});
		expect(normalizeContractOrder(raw, makeRawDetails())._unsafeUnwrapErr().code).toBe(
			"MALFORMED_ORDER",
		);
	});
});

describe("normalizeSubgraphOrder", () => {
	function makeRaw(overrides: Partial<RawSubgraphOrder> = {}): RawSubgraphOrder {
		return {
			orderId: "42",
			type: 1,
			status: 2,
			circleId: "7",
			userAddress: USER.toLowerCase(),
			usdcRecipientAddress: RECIPIENT.toLowerCase(),
			acceptedMerchantAddress: MERCHANT.toLowerCase(),
			usdcAmount: "100000000",
			fiatAmount: "8300000000",
			actualUsdcAmount: "99000000",
			actualFiatAmount: "8200000000",
			currency: stringToHex("INR", { size: 32 }),
			placedAt: "1700000000",
			acceptedAt: "1700000100",
			paidAt: "1700000200",
			completedAt: "1700000500",
			fixedFeePaid: "100",
			tipsPaid: "50",
			disputeStatus: 0,
			...overrides,
		};
	}

	it("parses strings to bigints and maps enums", () => {
		const normalized = normalizeSubgraphOrder(makeRaw())._unsafeUnwrap();
		expect(normalized).toMatchObject({
			orderId: 42n,
			type: "sell",
			status: "paid",
			usdcAmount: 100_000_000n,
			fiatAmount: 8_300_000_000n,
			actualUsdcAmount: 99_000_000n,
			actualFiatAmount: 8_200_000_000n,
			currency: "INR",
			placedAt: 1_700_000_000n,
			acceptedAt: 1_700_000_100n,
			paidAt: 1_700_000_200n,
			completedAt: 1_700_000_500n,
			circleId: 7n,
			fixedFeePaid: 100n,
			tipsPaid: 50n,
			disputeStatus: "none",
		});
	});

	it("errs MALFORMED_ORDER when type is out of range", () => {
		const result = normalizeSubgraphOrder(makeRaw({ type: 99 }));
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("MALFORMED_ORDER");
	});
});
