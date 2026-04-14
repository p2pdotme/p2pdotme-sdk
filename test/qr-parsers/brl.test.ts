import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parsePIX } from "../../src/qr-parsers/parsers/brl";
import { calculateCRC16 } from "../../src/qr-parsers/utils/crc16";

const SELL_PRICE = 5;
const PROXY_URL = process.env.PIX_PROXY_URL!;

beforeAll(() => {
	if (!PROXY_URL) {
		throw new Error(
			"Missing test env var: PIX_PROXY_URL. Copy test/.env.test.example to test/.env.test and set it.",
		);
	}
});

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function withCrc(inner: string): string {
	const crc = calculateCRC16(inner);
	return `${inner}6304${crc}`;
}

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

function buildJWT(payload: Record<string, unknown>): string {
	const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64");
	const body = Buffer.from(JSON.stringify(payload)).toString("base64");
	return `${header}.${body}.sig`;
}

describe("parsePIX (BRL) — real-world examples", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// Static PIX, email key, amount 150.00 (EMVCo MPM, BRL currency 986, country BR)
	const STATIC_EMAIL_KEY =
		"00020126340014BR.GOV.BCB.PIX0112foo@bar.test5204000053039865406150.005802BR5914NOME RECEBEDOR6008CIDADE A62100506PED00163045F53";

	// Static PIX, CPF-shaped key, no amount (payer-defined)
	const STATIC_CPF_NO_AMOUNT =
		"00020126330014BR.GOV.BCB.PIX0111000000000005204000053039865802BR5910NOME TESTE6008CIDADE B62070503***6304D727";

	// Static PIX, EVP (random) key, amount 42.50
	const STATIC_EVP =
		"00020126580014BR.GOV.BCB.PIX013600000000-0000-0000-0000-000000000000520400005303986540542.505802BR5917COMERCIO FICTICIO6008CIDADE C62070503***63048DDF";

	// Dynamic PIX with location URL (tag 26 → subtag 25)
	const DYNAMIC_PIX =
		"00020101021226590014BR.GOV.BCB.PIX2537example.test/v2/cobv/aaaabbbbccccdddd5204000053039865802BR5910LOJA TESTE6008CIDADE D62160512ORDEMTEST0016304B02B";

	it("parses static PIX with email key and amount", async () => {
		const data = unwrap(await parsePIX(STATIC_EMAIL_KEY, SELL_PRICE, {}));
		expect(data.paymentAddress).toBe("NOME RECEBEDOR");
		expect(data.amount).toEqual({ fiat: 150, usdc: 30 });
	});

	it("parses static PIX with CPF-shaped key and no amount (payer-defined)", async () => {
		const data = unwrap(await parsePIX(STATIC_CPF_NO_AMOUNT, SELL_PRICE, {}));
		expect(data.paymentAddress).toBe("NOME TESTE");
		expect(data.amount).toBeUndefined();
	});

	it("parses static PIX with EVP (random) key", async () => {
		const data = unwrap(await parsePIX(STATIC_EVP, SELL_PRICE, {}));
		expect(data.paymentAddress).toBe("COMERCIO FICTICIO");
		expect(data.amount).toEqual({ fiat: 42.5, usdc: 8.5 });
	});

	it("parses dynamic PIX and fetches amount via the real proxy URL", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(buildJWT({ valor: { original: "89.90" } }), { status: 200 }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const data = unwrap(
			await parsePIX(DYNAMIC_PIX, SELL_PRICE, { proxyUrl: PROXY_URL, orderId: "ORDEMTEST001" }),
		);
		expect(data.paymentAddress).toBe("LOJA TESTE");
		expect(data.amount).toEqual({ fiat: 89.9, usdc: 17.98 });

		const calledUrl = fetchMock.mock.calls[0][0] as URL;
		expect(calledUrl.origin).toBe(new URL(PROXY_URL).origin);
		expect(calledUrl.pathname).toBe("/pix");
		expect(calledUrl.searchParams.get("locationUrl")).toBe(
			"https://example.test/v2/cobv/aaaabbbbccccdddd",
		);
		expect(calledUrl.searchParams.get("orderId")).toBe("ORDEMTEST001");
	});
});

describe("parsePIX (BRL) — static", () => {
	it("parses merchant with static amount", async () => {
		const inner = `${tlv("00", "01")}${tlv("59", "LOJA")}${tlv("54", "25.00")}`;
		const qr = withCrc(inner);
		const data = unwrap(await parsePIX(qr, SELL_PRICE, {}));
		expect(data.paymentAddress).toBe("LOJA");
		expect(data.amount).toEqual({ fiat: 25, usdc: 5 });
	});

	it("uses MERCHANT_NOT_FOUND when tag 59 is absent", async () => {
		const inner = `${tlv("00", "01")}${tlv("54", "10.00")}`;
		const qr = withCrc(inner);
		const data = unwrap(await parsePIX(qr, SELL_PRICE, {}));
		expect(data.paymentAddress).toBe("MERCHANT_NOT_FOUND");
	});

	it("returns ok without amount when tag 54 is absent", async () => {
		const inner = `${tlv("00", "01")}${tlv("59", "LOJA")}`;
		const data = unwrap(await parsePIX(withCrc(inner), SELL_PRICE, {}));
		expect(data.amount).toBeUndefined();
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", async (_label, input) => {
		const result = await parsePIX(input, SELL_PRICE, {});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR on CRC mismatch", async () => {
		const inner = `${tlv("00", "01")}${tlv("59", "LOJA")}`;
		const result = await parsePIX(`${inner}6304FFFF`, SELL_PRICE, {});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR when payload format tag (00) is missing", async () => {
		const inner = `${tlv("59", "LOJA")}${tlv("54", "10.00")}`;
		const result = await parsePIX(withCrc(inner), SELL_PRICE, {});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});

describe("parsePIX (BRL) — dynamic", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	function buildDynamicQr(locationUrl: string): string {
		const pixKeyInfo = tlv("25", locationUrl);
		const inner = `${tlv("00", "01")}${tlv("26", pixKeyInfo)}${tlv("59", "LOJA")}`;
		return withCrc(inner);
	}

	it("fetches dynamic amount from proxyUrl", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(buildJWT({ valor: { original: "55.00" } }), { status: 200 }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const qr = buildDynamicQr("pix.example.com/loc/abc");
		const data = unwrap(await parsePIX(qr, SELL_PRICE, { proxyUrl: PROXY_URL }));

		expect(data.amount).toEqual({ fiat: 55, usdc: 11 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const calledUrl = fetchMock.mock.calls[0][0] as URL;
		expect(calledUrl.origin).toBe(new URL(PROXY_URL).origin);
		expect(calledUrl.pathname).toBe("/pix");
		expect(calledUrl.searchParams.get("locationUrl")).toBe("https://pix.example.com/loc/abc");
	});

	it("forwards orderId when provided in config", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(buildJWT({ valor: { original: "10.00" } }), { status: 200 }),
		);
		vi.stubGlobal("fetch", fetchMock);

		await parsePIX(buildDynamicQr("pix.example.com/loc/x"), SELL_PRICE, {
			proxyUrl: PROXY_URL,
			orderId: "order-123",
		});

		const calledUrl = fetchMock.mock.calls[0][0] as URL;
		expect(calledUrl.searchParams.get("orderId")).toBe("order-123");
	});

	it("returns FETCH_FAILED when proxyUrl is missing for dynamic QR", async () => {
		const qr = buildDynamicQr("pix.example.com/loc/abc");
		const result = await parsePIX(qr, SELL_PRICE, {});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("FETCH_FAILED");
	});

	it("returns FETCH_FAILED when proxy responds non-ok", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("bad", { status: 500, statusText: "Err" })),
		);
		const result = await parsePIX(buildDynamicQr("pix.example.com/x"), SELL_PRICE, {
			proxyUrl: PROXY_URL,
		});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("FETCH_FAILED");
	});

	it("returns FETCH_FAILED when proxy body is unparseable JWT", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-a-jwt", { status: 200 })));
		const result = await parsePIX(buildDynamicQr("pix.example.com/x"), SELL_PRICE, {
			proxyUrl: PROXY_URL,
		});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("FETCH_FAILED");
	});

	it("returns FETCH_FAILED when fetch throws", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
		const result = await parsePIX(buildDynamicQr("pix.example.com/x"), SELL_PRICE, {
			proxyUrl: PROXY_URL,
		});
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("FETCH_FAILED");
	});
});
