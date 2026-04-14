import { describe, expect, it } from "vitest";
import { parseUPI } from "../../src/qr-parsers/parsers/inr";

const SELL_PRICE = 80;

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

describe("parseUPI (INR)", () => {
	it("parses upi://pay URI with payment address only", () => {
		const result = parseUPI("upi://pay?pa=merchant@okaxis&pn=Merchant", SELL_PRICE);
		expect(result.isOk()).toBe(true);
		const data = unwrap(result);
		expect(data.paymentAddress).toBe("merchant@okaxis");
		expect(data.amount).toBeUndefined();
	});

	it("parses amount (am) and converts to usdc using sellPrice", () => {
		const result = parseUPI("upi://pay?pa=merchant@okaxis&am=800", SELL_PRICE);
		const data = unwrap(result);
		expect(data.amount).toEqual({ fiat: 800, usdc: 10 });
	});

	it("accepts plain query-string without upi://pay prefix", () => {
		const result = parseUPI("pa=user.name@bank&am=100.5", SELL_PRICE);
		const data = unwrap(result);
		expect(data.paymentAddress).toBe("user.name@bank");
		expect(data.amount?.fiat).toBe(100.5);
	});

	it("trims surrounding whitespace", () => {
		const result = parseUPI("  upi://pay?pa=foo@bar  ", SELL_PRICE);
		expect(unwrap(result).paymentAddress).toBe("foo@bar");
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseUPI(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when pa parameter is missing", () => {
		const result = parseUPI("upi://pay?pn=Merchant&am=100", SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for malformed UPI id", () => {
		const result = parseUPI("upi://pay?pa=not a upi id", SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_AMOUNT for non-numeric am", () => {
		const result = parseUPI("upi://pay?pa=m@b&am=notanumber", SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_AMOUNT");
	});

	it("returns INVALID_AMOUNT for zero or negative am", () => {
		const result = parseUPI("upi://pay?pa=m@b&am=0", SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_AMOUNT");
	});
});

describe("parseUPI (INR) — real-world examples", () => {
	it("parses a merchant QR with full query-string (pn, mc, tr, tn, am, cu)", () => {
		const qr =
			"upi://pay?pa=test.merchant@examplebank&pn=Test%20Merchant&mc=5411&tr=TXN0000001&tn=Payment&am=250.00&cu=INR";
		const data = unwrap(parseUPI(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe("test.merchant@examplebank");
		expect(data.amount).toEqual({ fiat: 250, usdc: 250 / 80 });
	});

	it("parses a personal QR with only pa and pn (no amount)", () => {
		const qr = "upi://pay?pa=testuser@examplebank&pn=Test%20User";
		const data = unwrap(parseUPI(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe("testuser@examplebank");
		expect(data.amount).toBeUndefined();
	});

	it("parses a long merchant handle with mixed alphanumerics", () => {
		const qr =
			"upi://pay?pa=examplemerchantqr0000000000000000@examplebank&pn=Example&am=1500&cu=INR";
		const data = unwrap(parseUPI(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe("examplemerchantqr0000000000000000@examplebank");
		expect(data.amount?.fiat).toBe(1500);
	});

	it("parses a small-decimal amount (99.99)", () => {
		const qr = "upi://pay?pa=sample.store@examplebank&pn=Sample%20Store&am=99.99&cu=INR";
		const data = unwrap(parseUPI(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe("sample.store@examplebank");
		expect(data.amount?.fiat).toBe(99.99);
	});
});
