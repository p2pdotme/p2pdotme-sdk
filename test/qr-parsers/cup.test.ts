import { describe, expect, it } from "vitest";
import { parseTransfermovil } from "../../src/qr-parsers/parsers/cup";

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

const QR_NO_AMOUNT = "TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,58555555,";

describe("parseTransfermovil (CUP)", () => {
	it("returns phone|card as payment address and no amount when the amount field is empty", () => {
		const data = unwrap(parseTransfermovil(QR_NO_AMOUNT, 400));
		expect(data.paymentAddress).toBe("58555555|9204959800000000");
		expect(data.amount).toBeUndefined();
	});

	it("parses the amount when present", () => {
		const data = unwrap(
			parseTransfermovil("TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,58555555,800", 400),
		);
		expect(data.amount).toEqual({ usdc: 2, fiat: 800 });
	});

	it("accepts a QR without the trailing amount separator", () => {
		const data = unwrap(
			parseTransfermovil("TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,58555555", 400),
		);
		expect(data.paymentAddress).toBe("58555555|9204959800000000");
	});

	it("ignores extra trailing fields", () => {
		const data = unwrap(
			parseTransfermovil(
				"TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,58555555,800,CUP",
				400,
			),
		);
		expect(data.paymentAddress).toBe("58555555|9204959800000000");
		expect(data.amount).toEqual({ usdc: 2, fiat: 800 });
	});

	it("strips the +53 country code from the phone", () => {
		const data = unwrap(
			parseTransfermovil("TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,+53 58555555,", 400),
		);
		expect(data.paymentAddress).toBe("58555555|9204959800000000");
	});

	it("strips spaces from the card number", () => {
		const data = unwrap(
			parseTransfermovil("TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204 9598 0000 0000,58555555,", 400),
		);
		expect(data.paymentAddress).toBe("58555555|9204959800000000");
	});

	it("accepts other operation types with the same field layout", () => {
		const data = unwrap(
			parseTransfermovil("TRANSFERMOVIL_ETECSA,PAGO,9204959800000000,58555555,", 400),
		);
		expect(data.paymentAddress).toBe("58555555|9204959800000000");
	});

	it("trims surrounding whitespace", () => {
		const data = unwrap(parseTransfermovil(`  ${QR_NO_AMOUNT}  `, 400));
		expect(data.paymentAddress).toBe("58555555|9204959800000000");
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s input", (_label, input) => {
		const result = parseTransfermovil(input, 400);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it.each([
		["a foreign prefix", "ENZONA,TRANSFERENCIA,9204959800000000,58555555,"],
		["missing fields", "TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000"],
		["a short card number", "TRANSFERMOVIL_ETECSA,TRANSFERENCIA,92049598,58555555,"],
		["a non-numeric card", "TRANSFERMOVIL_ETECSA,TRANSFERENCIA,92049598000000AB,58555555,"],
		["a bad phone number", "TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,555,"],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseTransfermovil(input, 400);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_AMOUNT when the amount field is not a positive number", () => {
		const result = parseTransfermovil(
			"TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,58555555,0",
			400,
		);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_AMOUNT");
	});
});
