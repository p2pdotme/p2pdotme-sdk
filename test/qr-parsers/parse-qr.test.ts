import { describe, expect, it } from "vitest";
import { parseQR } from "../../src/qr-parsers/parse-qr";
import { calculateCRC16 } from "../../src/qr-parsers/utils/crc16";
import type { SupportedCurrency } from "../../src/qr-parsers/types";

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function withCrc(inner: string): string {
	return `${inner}6304${calculateCRC16(inner)}`;
}

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

describe("parseQR dispatcher", () => {
	it("dispatches INR to UPI parser", async () => {
		const data = unwrap(await parseQR("upi://pay?pa=m@b&am=800", "INR", 80));
		expect(data.paymentAddress).toBe("m@b");
		expect(data.amount?.fiat).toBe(800);
	});

	it("dispatches IDR to QRIS parser", async () => {
		const qr = `000201${tlv("59", "STORE")}${tlv("54", "16000")}`;
		const data = unwrap(await parseQR(qr, "IDR", 16000));
		expect(data.paymentAddress).toBe("STORE");
	});

	it("dispatches BRL to PIX parser (static)", async () => {
		const inner = `${tlv("00", "01")}${tlv("59", "LOJA")}${tlv("54", "10.00")}`;
		const data = unwrap(await parseQR(withCrc(inner), "BRL", 5));
		expect(data.paymentAddress).toBe("LOJA");
		expect(data.amount).toEqual({ fiat: 10, usdc: 2 });
	});

	it("dispatches ARS to MercadoPago parser", async () => {
		const inner = `${tlv("00", "01")}${tlv("58", "AR")}${tlv("59", "SHOP")}`;
		const data = unwrap(await parseQR(withCrc(inner), "ARS", 1000));
		expect(data.paymentAddress).toBe("SHOP");
	});

	it("dispatches VEN to PagoMovil parser", async () => {
		const data = unwrap(await parseQR("SGVsbG8=?x=1", "VEN", 40));
		expect(data.paymentAddress).toBe("SGVsbG8=?x=1");
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s regardless of currency", async (_label, input) => {
		const result = await parseQR(input, "INR", 80);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_CURRENCY for unsupported currency", async () => {
		const result = await parseQR("any", "USD" as unknown as SupportedCurrency, 1);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_CURRENCY");
	});
});
