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
		const data = unwrap(
			await parseQR({ qrData: "upi://pay?pa=m@b&am=800", currency: "INR", sellPrice: 80 }),
		);
		expect(data.paymentAddress).toBe("m@b");
		expect(data.amount?.fiat).toBe(800);
	});

	it("dispatches IDR to QRIS parser", async () => {
		const qr = `000201${tlv("59", "STORE")}${tlv("54", "16000")}`;
		const data = unwrap(await parseQR({ qrData: qr, currency: "IDR", sellPrice: 16000 }));
		expect(data.paymentAddress).toBe("STORE");
	});

	it("dispatches BRL to PIX parser (static)", async () => {
		const inner = `${tlv("00", "01")}${tlv("59", "LOJA")}${tlv("54", "10.00")}`;
		const data = unwrap(
			await parseQR({ qrData: withCrc(inner), currency: "BRL", sellPrice: 5 }),
		);
		expect(data.paymentAddress).toBe("LOJA");
		expect(data.amount).toEqual({ fiat: 10, usdc: 2 });
	});

	it("dispatches ARS to MercadoPago parser", async () => {
		const inner = `${tlv("00", "01")}${tlv("58", "AR")}${tlv("59", "SHOP")}`;
		const data = unwrap(
			await parseQR({ qrData: withCrc(inner), currency: "ARS", sellPrice: 1000 }),
		);
		expect(data.paymentAddress).toBe("SHOP");
	});

	it("dispatches VEN to PagoMovil parser", async () => {
		const data = unwrap(
			await parseQR({ qrData: "SGVsbG8=?x=1", currency: "VEN", sellPrice: 40 }),
		);
		expect(data.paymentAddress).toBe("SGVsbG8=?x=1");
	});

	it("dispatches ECU to the DeUna parser", async () => {
		const data = unwrap(
			await parseQR({
				qrData: "https://pagar.deuna.app/demo/merchant?id=abc123",
				currency: "ECU",
				sellPrice: 1,
			}),
		);
		expect(data.paymentAddress).toBe("abc123");
		expect(data.amount).toBeUndefined();
	});

	it("dispatches PEN to the Peru parser", async () => {
		const sample =
			"0002010102113932acfba6cb922753c690f09280f365d7a25204561153036045802PE5906YAPERO6004Lima6304ECE9";
		const data = unwrap(
			await parseQR({ qrData: sample, currency: "PEN", sellPrice: 3.75 }),
		);
		expect(data.paymentAddress).toBe(sample);
		expect(data.amount).toBeUndefined();
	});

	it("dispatches PHP to the QR Ph parser", async () => {
		const sample =
			"00020101021127830012com.p2pqrpay0111GXCHPHM2XXX02081234567803150000000000000000417TESTTESTTESTTEST15204601653036085802PH5909TEST SHOP6006Manila61041000630476A9";
		const result = unwrap(
			await parseQR({ qrData: sample, currency: "PHP", sellPrice: 58.5 }),
		);
		expect(result.paymentAddress).toBe(sample);
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s regardless of currency", async (_label, input) => {
		const result = await parseQR({ qrData: input, currency: "INR", sellPrice: 80 });
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_CURRENCY for unsupported currency", async () => {
		const result = await parseQR({
			qrData: "any",
			currency: "USD" as unknown as SupportedCurrency,
			sellPrice: 1,
		});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_CURRENCY");
	});
});
