import { describe, expect, it } from "vitest";
import { parsePagoMovil } from "../../src/qr-parsers/parsers/ven";

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

describe("parsePagoMovil (VEN)", () => {
	it("returns the full QR string as payment address for base64 payload + query", () => {
		const qr = "SGVsbG9Xb3JsZA==?param=1";
		const data = unwrap(parsePagoMovil(qr, 40));
		expect(data.paymentAddress).toBe(qr);
	});

	it("trims whitespace but preserves the trimmed QR as payment address", () => {
		const qr = "dGVzdA==?x=y";
		const data = unwrap(parsePagoMovil(`  ${qr}  `, 40));
		expect(data.paymentAddress).toBe(qr);
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
		const result = parsePagoMovil("not base64!@#?x=y", 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when payload before '?' is empty", () => {
		const result = parsePagoMovil("?x=y", 40);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});

describe("parsePagoMovil (VEN) — real-world examples", () => {
	// Venezuelan PagoMóvil QRs are an opaque base64-encoded payload that only
	// the banks can decipher, followed by a `?` and routing metadata.
	// The base64 below decodes to:
	//   "the venezuelan qr is a base64 encrypted string that only banks can decipher"
	const VEN_BASE64 =
		"dGhlIHZlbmV6dWVsYW4gcXIgaXMgYSBiYXNlNjQgZW5jcnlwdGVkIHN0cmluZyB0aGF0IG9ubHkgYmFua3MgY2FuIGRlY2lwaGVy";

	const VEN_BANCO_A = `${VEN_BASE64}?bank=BANCO_A`;
	const VEN_BANCO_B = `${VEN_BASE64}?bank=BANCO_B`;
	const VEN_BANCO_C = `${VEN_BASE64}?bank=BANCO_C`;
	const VEN_BANCO_D = `${VEN_BASE64}?bank=BANCO_D`;

	it("parses a PagoMóvil QR routed to BANCO_A", () => {
		const data = unwrap(parsePagoMovil(VEN_BANCO_A, 40));
		expect(data.paymentAddress).toBe(VEN_BANCO_A);
	});

	it("parses a PagoMóvil QR routed to BANCO_B", () => {
		const data = unwrap(parsePagoMovil(VEN_BANCO_B, 40));
		expect(data.paymentAddress).toBe(VEN_BANCO_B);
	});

	it("parses a PagoMóvil QR routed to BANCO_C", () => {
		const data = unwrap(parsePagoMovil(VEN_BANCO_C, 40));
		expect(data.paymentAddress).toBe(VEN_BANCO_C);
	});

	it("parses a PagoMóvil QR routed to BANCO_D", () => {
		const data = unwrap(parsePagoMovil(VEN_BANCO_D, 40));
		expect(data.paymentAddress).toBe(VEN_BANCO_D);
	});
});
