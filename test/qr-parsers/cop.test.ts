import { describe, expect, it } from "vitest";
import { parseCOP } from "../../src/qr-parsers/parsers/cop";

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

// Synthetic fixtures only — shapes mirror real DIAN / Nequi / Bre-B QRs but
// every identifier (CUFE, NIT, DocAdq, merchant name, account number) is made
// up. Do NOT paste real-world QRs here, they contain PII.

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

// Minimal valid Colombian EMVCo TLV: country 5802CO + currency 5303170 +
// merchant name. parseCOP only checks for the CO country / COP currency
// markers and extracts tag 59 — the rest is just structurally valid filler.
function buildCopEmv(merchantName: string, extraTemplates = ""): string {
	const inner =
		`${tlv("00", "01")}` +
		`${tlv("01", "11")}` +
		extraTemplates +
		`${tlv("52", "0000")}` +
		`${tlv("53", "170")}` +
		`${tlv("58", "CO")}` +
		`${tlv("59", merchantName)}`;
	return `${inner}6304ABCD`;
}

describe("parseCOP — DIAN electronic invoice (newline format)", () => {
	const FAKE_CUFE = "0".repeat(96);
	const QR = `NumFac: TEST00000001
FecFac: 2024-01-01
HorFac: 00:00:00-05:00
NitFac: 900000000
DocAdq: 1000000000
ValFac: 100.00
ValIva: 19.00
ValOtroIm: 0.00
ValTolFac: 119.00
CUFE: ${FAKE_CUFE}
https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${FAKE_CUFE}`;

	it("returns CUFE as paymentAddress", () => {
		const data = unwrap(parseCOP(QR, 4000));
		expect(data.paymentAddress).toBe(FAKE_CUFE);
	});
});

describe("parseCOP — DIAN compact (comma-separated, lowercase Cufe)", () => {
	const FAKE_CUFE = "a".repeat(40);
	const QR = `NumFac: TEST00000002,FecFac:20240101000000,NitFac:900000001,DocAdq:1000000001,ValFac:0.00;ValIVA:0.00,ValOtrImp:0.00,ValFacImp:0.00,Cufe:${FAKE_CUFE}`;

	it("returns Cufe as paymentAddress", () => {
		const data = unwrap(parseCOP(QR, 4000));
		expect(data.paymentAddress).toBe(FAKE_CUFE);
	});
});

describe("parseCOP — Nequi-shaped EMVCo QR", () => {
	const QR = buildCopEmv("TEST MERCHANT", tlv("92", `${tlv("00", "co.com.nequi")}${tlv("01", "P2P.NEQUI")}`));

	it("extracts merchant name from tag 59", () => {
		const data = unwrap(parseCOP(QR, 4000));
		expect(data.paymentAddress).toBe("TEST MERCHANT");
		expect(data.amount).toBeUndefined();
	});
});

describe("parseCOP — Bre-B-shaped EMVCo QR", () => {
	const QR = buildCopEmv(
		"testshop",
		tlv("26", `${tlv("00", "CO.COM.RBM.LLA")}${tlv("05", "0000000000")}`),
	);

	it("extracts merchant name from tag 59", () => {
		const data = unwrap(parseCOP(QR, 4000));
		expect(data.paymentAddress).toBe("testshop");
	});
});

describe("parseCOP — invalid inputs", () => {
	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseCOP(input, 4000);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for unrecognized payload", () => {
		const result = parseCOP("just some random text", 4000);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
