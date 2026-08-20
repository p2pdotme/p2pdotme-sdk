import { describe, expect, it } from "vitest";
import { parseBolivia } from "../../src/qr-parsers/parsers/bob";

const SELL_PRICE = 6.96;

function tlv(tag: string, value: string): string {
	return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
}

function unwrap<T, E>(r: { isOk(): boolean; isErr(): boolean; value?: T; error?: E }) {
	if (r.isErr()) throw new Error(`expected ok, got err: ${String(r.error)}`);
	return r.value as T;
}

// QR Simple EMVCo payload — currency 068 (BOB), country BO.
const SAMPLE = `000201${tlv("53", "068")}${tlv("58", "BO")}${tlv("59", "TIENDA")}6304ABCD`;

// Real Bolivia QR Simple encrypted envelopes (`<base64>|<hex checksum>`).
// BancoSol/Yape use a 32-hex checksum; Banco Fie uses a 24-hex checksum.
const BANCOSOL_QR =
	"rqeunYVqZLSBH9wP9g9edc2eo8ywIMBYO4Hp6zkL7K/lvplzVgpBfA7UA7nH6aNP7wnaDJe41h4YBHYVo8VCaYpigvLPxmRdbIrykn2IFuJUi+2fCfY2Do7EtQU11c8JyZ0C1L5KRe5I4E59r9zeghuVQUUNtgaSsZS+mqqVQ5z0EDqo21xVmLjD3PWVY/4LJpz9Cn8aFSwGPVk7fUd9SUpCGV812+IK9K1fE2okI+rtKmyWANBFWCUyz3EE2pvoRjMh6EosPnGzU1cRDapU0ZcOnsZAryOrXQz7d0WM/rn6OHm5rW+a5OVt93YqOqfNLXW2VYQPVbTg85+UlkQIpw==|07F204D5938E28075E5BF22340391EE1";
const YAPE_QR =
	"zwUp1HWQXCJtIOpnzdz0Va5PY3tpogHLdas/RqJIfNuBldNxmwHleCdbkeKpOLm1kEsm/geWQFIQ8Mwzd3Paz26FhXY/uxt39LdKP2wRimF89iBRlfJkymXCZngbsEnLOO2Uwam8z7QqCCuIQK9qClaVKt8nB7mqEwgJR6/QZW5lD/AqPcxCz+xMuvSGONv1ve+lfWgEcrm0nWyso4qxSdeyGXbO3QVg5FcfFg9MAJXLkD4flE16RAvpEMWcs5OV5gUh2w6UOec44U4ZPwhQXaHE97nEt8blcN9zogIE9HhSaU+iA2pulgAyRZEOo83lXor4nm5zOhoif8kQUxsllg==|0FABBA22E4072538599B68591360A676";
const BANCO_FIE_QR =
	"UGbUtEEepdB6Lu0ZjvDh5rCdCUUw9mc8i8+lV0amjuD94l//AN/b4sE1OkUqxb5MR2WwIAe8L97Ax6GEUc0EAcWk/gA/mqwmoLqdUpJGzSqBFo+FcdjRevpIxNrkBj4L3IM6my02LUbDZUdpoeFzrQ/rJoPu/qtrrf+7JAw2GOSoOGl5jBS2IH6E11geLOs85G7hLkSI8YmI39WbAFqL0mmt+B13CZg5owV2LO9Ul3v9KMbg0D90oL9jk39bxwzuYxAOe5AjoUb4WxdIEO05OaWG2H6St0O4ygHDpTUEg+j10IlqCCBM1h7inYU/BON7S3GSS9OahIt3QnbUqzyRuQ==|76b7a1c09287d8f0a3242c7c";

describe("parseBolivia (BOB)", () => {
	it.each([
		["BancoSol (32-hex checksum)", BANCOSOL_QR],
		["Yape Bs (32-hex checksum)", YAPE_QR],
		["Banco Fie (24-hex checksum)", BANCO_FIE_QR],
	])("accepts real encrypted envelope: %s", (_label, qr) => {
		const data = unwrap(parseBolivia(qr, SELL_PRICE));
		expect(data.paymentAddress).toBe(qr);
		expect(data.amount).toBeUndefined();
	});

	it("parses a QR Simple payload and returns the raw payload verbatim", () => {
		const data = unwrap(parseBolivia(SAMPLE, SELL_PRICE));
		expect(data.paymentAddress).toBe(SAMPLE);
		expect(data.amount).toBeUndefined();
	});

	it("parses an amount (tag 54) and converts to usdc", () => {
		const withAmount = `000201${tlv("53", "068")}${tlv("54", "1392")}${tlv("58", "BO")}${tlv("59", "TIENDA")}`;
		const data = unwrap(parseBolivia(withAmount, SELL_PRICE));
		expect(data.paymentAddress).toBe(withAmount);
		expect(data.amount).toEqual({ fiat: 1392, usdc: 1392 / SELL_PRICE });
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("returns INVALID_QR for %s", (_label, input) => {
		const result = parseBolivia(input, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});

	it("returns INVALID_QR for a non-Bolivia currency (tag 53 not 068)", () => {
		const tweaked = SAMPLE.replace("5303068", "5303840");
		const result = parseBolivia(tweaked, SELL_PRICE);
		expect(result.isErr()).toBe(true);
		if (result.isErr()) expect(result.error.code).toBe("INVALID_QR");
	});
});
