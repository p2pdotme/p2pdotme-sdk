import { describe, expect, it } from "vitest";
import { parseQRIS } from "../../src/qr-parsers/parsers/idr";

const SELL_PRICE = 16000;

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

describe("parseQRIS (IDR)", () => {
	it("parses merchant name only", () => {
		const qr = `000201${tlv("59", "ACME STORE")}`;
		const data = unwrap(parseQRIS(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe("ACME STORE");
		expect(data.amount).toBeUndefined();
	});

	it("parses merchant with amount and converts to usdc", () => {
		const qr = `000201${tlv("59", "ACME")}${tlv("54", "16000")}`;
		const data = unwrap(parseQRIS(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe("ACME");
		expect(data.amount).toEqual({ fiat: 16000, usdc: 1 });
	});

	it("trims whitespace", () => {
		const qr = `  ${tlv("59", "ACME")}  `;
		expect(unwrap(parseQRIS(qr, SELL_PRICE)).paymentAddress).toBe("ACME");
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseQRIS(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when merchant name tag 59 is missing", () => {
		const qr = `000201${tlv("54", "100")}`;
		const result = parseQRIS(qr, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_AMOUNT for non-parseable amount tag", () => {
		const qr = `000201${tlv("59", "ACME")}${tlv("54", "xyz")}`;
		const result = parseQRIS(qr, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_AMOUNT");
	});
});

describe("parseQRIS (IDR) — real-world examples", () => {
	// EMVCo MPM QRIS, dynamic, currency 360 (IDR), country ID, amount 50000, MCC 4829
	const QRIS_WITH_AMOUNT =
		"00020101021226570016ID.CO.SAMPLE.WWW01189360091400001234560211000000000015204482953033605405500005802ID5918WARUNG CONTOH SATU601212345 KOTA A";

	// EMVCo MPM QRIS, static, no amount, MCC 5411
	const QRIS_NO_AMOUNT =
		"00020101021126430017ID.CO.EXAMPLE.WWW01189360098800009876545204541153033605802ID5915TOKO CONTOH DUA600905 KOTA B";

	it("parses a dynamic QRIS with amount", () => {
		const data = unwrap(parseQRIS(QRIS_WITH_AMOUNT, SELL_PRICE));
		expect(data.paymentAddress).toBe("WARUNG CONTOH SATU");
		expect(data.amount).toEqual({ fiat: 50000, usdc: 50000 / SELL_PRICE });
	});

	it("parses a static QRIS without amount (payer-defined)", () => {
		const data = unwrap(parseQRIS(QRIS_NO_AMOUNT, SELL_PRICE));
		expect(data.paymentAddress).toBe("TOKO CONTOH DUA");
		expect(data.amount).toBeUndefined();
	});
});
