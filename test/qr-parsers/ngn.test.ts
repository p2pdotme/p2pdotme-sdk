import { describe, expect, it } from "vitest";
import { parseNGN } from "../../src/qr-parsers/parsers/ngn";
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

describe("parseNGN — NIBSS NQR (EMVCo)", () => {
	it("parses a static NQR with merchant name, no amount", () => {
		const merchantInfo = `${tlv("00", "NG.COM.NIBSSPLC.QR")}${tlv("01", "S000000000000")}`;
		const inner =
			`${tlv("00", "01")}${tlv("01", "11")}${tlv("26", merchantInfo)}` +
			`${tlv("52", "0000")}${tlv("53", "566")}${tlv("58", "NG")}` +
			`${tlv("59", "ACME STORE NG")}${tlv("60", "Lagos")}`;
		const data = unwrap(parseNGN(withCrc(inner), 1500));
		expect(data.paymentAddress).toBe("ACME STORE NG");
		expect(data.amount).toBeUndefined();
	});

	it("parses a dynamic NQR with amount", () => {
		const merchantInfo = `${tlv("00", "NG.COM.NIBSSPLC.QR")}${tlv("01", "S000000000000")}`;
		const inner =
			`${tlv("00", "01")}${tlv("01", "12")}${tlv("26", merchantInfo)}` +
			`${tlv("52", "0000")}${tlv("53", "566")}${tlv("54", "15000.00")}` +
			`${tlv("58", "NG")}${tlv("59", "MERCHANT ONE")}${tlv("60", "Lagos")}`;
		const data = unwrap(parseNGN(withCrc(inner), 1500));
		expect(data.paymentAddress).toBe("MERCHANT ONE");
		expect(data.amount).toEqual({ usdc: 10, fiat: 15000 });
	});

	it("accepts NQR with only country=NG marker (no explicit currency tag)", () => {
		const inner =
			`${tlv("00", "01")}${tlv("01", "11")}${tlv("58", "NG")}${tlv("59", "SHOP NG")}`;
		const data = unwrap(parseNGN(withCrc(inner), 1500));
		expect(data.paymentAddress).toBe("SHOP NG");
	});

	it("returns INVALID_QR on CRC mismatch", () => {
		const inner = `${tlv("00", "01")}${tlv("53", "566")}${tlv("58", "NG")}${tlv("59", "M")}`;
		const result = parseNGN(`${inner}6304FFFF`, 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when no Nigerian marker is present", () => {
		const inner = `${tlv("00", "01")}${tlv("53", "840")}${tlv("58", "US")}${tlv("59", "SHOP")}`;
		const result = parseNGN(withCrc(inner), 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when merchant name is missing", () => {
		const inner = `${tlv("00", "01")}${tlv("53", "566")}${tlv("58", "NG")}`;
		const result = parseNGN(withCrc(inner), 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_AMOUNT on unparseable amount", () => {
		const inner =
			`${tlv("00", "01")}${tlv("53", "566")}${tlv("54", "abc")}` +
			`${tlv("58", "NG")}${tlv("59", "SHOP")}`;
		const result = parseNGN(withCrc(inner), 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_AMOUNT");
	});
});

describe("parseNGN — SPD format (Access Bank Nigeria)", () => {
	it("parses an SPD QR with account, amount and message", () => {
		const data = unwrap(parseNGN("SPD*1.0*ACC:1234567890*AM:40,000.00*MSG:Test*", 1500));
		expect(data.paymentAddress).toBe("1234567890");
		expect(data.amount).toEqual({ usdc: 40000 / 1500, fiat: 40000 });
	});

	it("parses an SPD QR with only account", () => {
		const data = unwrap(parseNGN("SPD*1.0*ACC:1234567890*", 1500));
		expect(data.paymentAddress).toBe("1234567890");
		expect(data.amount).toBeUndefined();
	});

	it("returns INVALID_QR when ACC field is missing", () => {
		const result = parseNGN("SPD*1.0*AM:1000*", 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_AMOUNT on unparseable amount", () => {
		const result = parseNGN("SPD*1.0*ACC:1234567890*AM:notanumber*", 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_AMOUNT");
	});
});

describe("parseNGN — input validation", () => {
	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseNGN(input, 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for non-TLV, non-SPD data", () => {
		const result = parseNGN("hello world", 1500);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
