import { describe, expect, it } from "vitest";
import { isPagoMovilQr, parsePagoMovil } from "../../src/qr-parsers/parsers/ven";

const TESORO =
	"dBKxwilNo3+ATaUX7YpeGfb+DOGtIBnj2DpAypb7U6gqar/JxjhLFaXIKyv9O+Z6xh3rX2B6huFupypAZjcj0istG7bYvJ5XO3NfqXYAeVR+hEwkuuBBcCy+9MKH7OJMvDGEXU143a7+bgcrTjaCzQ==?merchantId=0163&strong_id=1786921164-3";
const MERCANTIL =
	"m28tuwbizhMer7LqTrXDR390LJYTLTMLxvAojSnPrZ2ese+vGGypN/1IfjBJVQyduC5qN+Hvyqa8FzYoP1xntmkI7PU6HlnAEpYgEZ1TSahnec0Ctt1Tpg3gK3rTG0ay5ST8h24YHsc6Q4aZtmxdLjtKyeChlbRhqq6v8e9qNlrpc/2nZ6HV0a1mcIOz7qm4GgpPQMaHW5ywzkuWE0ps9fMB9kCiyGPNj6G0SZomROybsNlMDevCMdpbGyz5w84MxNdomJwEgy8qhBYgKSEPlCn/cCmAdeZCtyFypu6Tr1tDgrlL0kLNRrv2CQKkLw3uHx8zxZohwuu3Cau0io4elA==?merchantId=0105&strong_id=260722171116&origin=web";

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

describe("isPagoMovilQr (VEN)", () => {
	it("accepts live S7B QRs with merchantId (same rule as SELL validateQr)", () => {
		expect(isPagoMovilQr(TESORO)).toBe(true);
		expect(isPagoMovilQr(MERCANTIL)).toBe(true);
	});

	it.each([
		["empty", ""],
		["no query", "SGVsbG8="],
		["short blob", "SGVsbG8=?merchantId=0134"],
		["missing merchantId", `${"A".repeat(48)}?bank=BANCO_A`],
		["non-base64", "not base64!@#?merchantId=0134"],
		["empty blob", "?merchantId=0134"],
	])("rejects %s", (_label, input) => {
		expect(isPagoMovilQr(input)).toBe(false);
	});
});

describe("parsePagoMovil (VEN)", () => {
	it("returns the full Tesoro QR string as payment address", () => {
		const data = unwrap(parsePagoMovil(TESORO, 40));
		expect(data.paymentAddress).toBe(TESORO);
	});

	it("trims whitespace but preserves the trimmed QR as payment address", () => {
		const data = unwrap(parsePagoMovil(`  ${MERCANTIL}  `, 40));
		expect(data.paymentAddress).toBe(MERCANTIL);
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parsePagoMovil(input, 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when there is no '?' separator", () => {
		const result = parsePagoMovil("SGVsbG8=", 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when payload has non-base64 characters", () => {
		const result = parsePagoMovil("not base64!@#?merchantId=0134", 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when payload before '?' is empty", () => {
		const result = parsePagoMovil("?merchantId=0134", 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when merchantId is missing (same rule as SELL upload)", () => {
		const result = parsePagoMovil(`${"A".repeat(48)}?bank=BANCO_A`, 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when the blob is shorter than 40 characters", () => {
		const result = parsePagoMovil("SGVsbG8=?merchantId=0134", 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
