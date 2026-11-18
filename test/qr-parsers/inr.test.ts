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

	it.each(["undefined", "null", ""])(
		"treats a placeholder am=%j from a buggy QR generator as no amount",
		(placeholder) => {
			// Seen in the wild: a merchant sticker QR generated with JS `undefined`
			// serialised straight into the query string. UPI apps pay it fine.
			const qr = `upi://pay?pa=gpay-12204366557@okbizaxis&pn=Kagithala%20resturant&tn=${placeholder}&am=${placeholder}`;
			const data = unwrap(parseUPI(qr, SELL_PRICE));
			expect(data.paymentAddress).toBe("gpay-12204366557@okbizaxis");
			expect(data.amount).toBeUndefined();
		},
	);

	it("parses a small-decimal amount (99.99)", () => {
		const qr = "upi://pay?pa=sample.store@examplebank&pn=Sample%20Store&am=99.99&cu=INR";
		const data = unwrap(parseUPI(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe("sample.store@examplebank");
		expect(data.amount?.fiat).toBe(99.99);
	});
});

describe("parseUPI (INR) — Fonepay (Nepal) cross-border QR", () => {
	// Static Fonepay NPQR (country NP, currency 524 NPR, valid CRC). Indian UPI
	// apps can pay these via the NPCI–Fonepay cross-border link.
	const FONEPAY_QR =
		"0002010102110216427142002163748726400011fonepay.com07162222170021637482110115204939953035245802NP5927PM DAIBI PRAKOP UDDHAR KOSH6011PUTALISADAK6211070722244026304ecfd";

	it("accepts a Fonepay QR and returns the payload verbatim", () => {
		const result = parseUPI(FONEPAY_QR, SELL_PRICE);
		expect(result.isOk()).toBe(true);
		const data = unwrap(result);
		expect(data.paymentAddress).toBe(FONEPAY_QR);
	});

	it("does not read an NPR amount from the Fonepay QR", () => {
		const data = unwrap(parseUPI(FONEPAY_QR, SELL_PRICE));
		expect(data.amount).toBeUndefined();
	});

	it("rejects a Fonepay-looking QR with a broken CRC", () => {
		const broken = `${FONEPAY_QR.slice(0, -4)}0000`;
		const result = parseUPI(broken, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});

describe("parseUPI (INR) — UPI mandate / AutoPay QRs are rejected", () => {
	// Real-world UPI AutoPay mandate QR: scanning it would register a recurring
	// debit (up to ₹15,000 for 10 years), not make a one-off payment.
	const MANDATE_QR =
		"upi://mandate?ver=01&pa=anomaly.cfp@cashfreensdlpb&pn=Anomaly&tr=enroll403842870&am=15000.00&cu=INR&amrule=MAX&mode=04&recur=ASPRESENTED&validitystart=18112026&validityend=15112036&mc=5734&txnType=CREATE&tn=OPENCODE&fam=943.70&purpose=14&block=N&rev=Y&orgid=000000";

	function expectInvalid(qr: string) {
		const result = parseUPI(qr, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	}

	it("rejects a upi://mandate QR", () => {
		expectInvalid(MANDATE_QR);
	});

	it("rejects the mandate scheme regardless of case", () => {
		expectInvalid(MANDATE_QR.replace("upi://mandate", "UPI://MANDATE"));
	});

	it("does not reject a non-mandate UPI intent (e.g. upi://collect)", () => {
		const data = unwrap(parseUPI("upi://collect?pa=foo@bar&am=800", SELL_PRICE));
		expect(data.paymentAddress).toBe("foo@bar");
	});

	it.each([
		["recur", "upi://pay?pa=foo@bar&am=10&recur=MONTHLY"],
		["amrule", "upi://pay?pa=foo@bar&am=10&amrule=MAX"],
		["validitystart", "upi://pay?pa=foo@bar&validitystart=18112026"],
		["validityend", "upi://pay?pa=foo@bar&validityend=15112036"],
		["txnType=CREATE", "upi://pay?pa=foo@bar&txnType=CREATE"],
		["scheme-less mandate params", "pa=foo@bar&am=10&recur=ASPRESENTED"],
	])("rejects a pay QR carrying mandate param %s", (_label, qr) => {
		expectInvalid(qr);
	});

	it("still accepts a normal upi://pay QR (scheme case-insensitive)", () => {
		const data = unwrap(parseUPI("UPI://PAY?pa=merchant@okaxis&am=800", SELL_PRICE));
		expect(data.paymentAddress).toBe("merchant@okaxis");
	});
});
