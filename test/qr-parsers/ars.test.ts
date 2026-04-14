import { describe, expect, it } from "vitest";
import { parseMercadoPago } from "../../src/qr-parsers/parsers/ars";
import { calculateCRC16 } from "../../src/qr-parsers/utils/crc16";

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

describe("parseMercadoPago (ARS)", () => {
	it("parses a valid ARS QR with merchant name", () => {
		const inner = `${tlv("00", "01")}${tlv("53", "032")}${tlv("58", "AR")}${tlv("59", "MERCADOPAGO")}`;
		const data = unwrap(parseMercadoPago(withCrc(inner), 1000));
		expect(data.paymentAddress).toBe("MERCADOPAGO");
	});

	it("falls back to 'Unknown' when merchant tag 59 is missing", () => {
		const inner = `${tlv("00", "01")}${tlv("53", "032")}${tlv("58", "AR")}`;
		const data = unwrap(parseMercadoPago(withCrc(inner), 1000));
		expect(data.paymentAddress).toBe("Unknown");
	});

	it("accepts QR with only 5802AR marker (no explicit 5303032)", () => {
		const inner = `${tlv("00", "01")}${tlv("58", "AR")}${tlv("59", "SHOP")}`;
		const data = unwrap(parseMercadoPago(withCrc(inner), 1000));
		expect(data.paymentAddress).toBe("SHOP");
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseMercadoPago(input, 1000);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when neither ARS nor AR markers are present", () => {
		const inner = `${tlv("00", "01")}${tlv("59", "SHOP")}`;
		const result = parseMercadoPago(withCrc(inner), 1000);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR on CRC mismatch", () => {
		const inner = `${tlv("00", "01")}${tlv("58", "AR")}${tlv("59", "SHOP")}`;
		const result = parseMercadoPago(`${inner}6304FFFF`, 1000);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});

describe("parseMercadoPago (ARS) — real-world examples", () => {
	// EMVCo MPM, dynamic, GUI com.mercadolibre, ARS currency (032), country AR, amount 2500.00
	const MP_STORE_WITH_AMOUNT =
		"00020101021226410016com.mercadolibre01090000000000204000052045411530303254072500.005802AR5912COMERCIO UNO6008CIUDAD A63046A3A";

	// Static (POI 11), no amount — payer-defined
	const MP_PERSONAL_NO_AMOUNT =
		"00020101021126410016com.mercadolibre0109111111111020400005204000053030325802AR5911PERSONA UNO6008CIUDAD B630467A9";

	// Dynamic, amount 50000.00
	const MP_HIGH_AMOUNT =
		"00020101021226410016com.mercadolibre010922222222202040000520454115303032540850000.005802AR5910TIENDA DOS6008CIUDAD C63040A39";

	it("parses a MercadoPago store QR with amount", () => {
		const data = unwrap(parseMercadoPago(MP_STORE_WITH_AMOUNT, 1000));
		expect(data.paymentAddress).toBe("COMERCIO UNO");
	});

	it("parses a MercadoPago personal QR without amount", () => {
		const data = unwrap(parseMercadoPago(MP_PERSONAL_NO_AMOUNT, 1000));
		expect(data.paymentAddress).toBe("PERSONA UNO");
	});

	it("parses a higher-value merchant QR (ARS 50,000)", () => {
		const data = unwrap(parseMercadoPago(MP_HIGH_AMOUNT, 1000));
		expect(data.paymentAddress).toBe("TIENDA DOS");
	});
});
