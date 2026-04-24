import { CURRENCY } from "../country";
import { parseMercadoPago } from "./parsers/ars";
import { parsePIX } from "./parsers/brl";
import { parseQRIS } from "./parsers/idr";
import { parseUPI } from "./parsers/inr";
import { parseNGN } from "./parsers/ngn";
import { parsePagoMovil } from "./parsers/ven";
import type { ParseQRParams, ParseResult } from "./types";
import { failure } from "./types";

/**
 * Parses a QR string for the given currency and returns the extracted payment data.
 *
 * This dispatcher is `async` because dynamic PIX (BRL) QRs store the amount
 * behind a location URL pointing at the issuing bank's PIX endpoint. The SDK
 * resolves that URL via a CORS-bypassing proxy (see `proxyUrl`), which returns
 * a signed JWT whose `valor.original` field holds the amount. All other parsers
 * (UPI, QRIS, MercadoPago, PagoMovil) and static PIX are synchronous and resolve
 * immediately.
 */
export async function parseQR(params: ParseQRParams): Promise<ParseResult> {
	const { qrData, currency, sellPrice, proxyUrl, orderId } = params;

	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	switch (currency) {
		case CURRENCY.INR:
			return parseUPI(qrData, sellPrice);
		case CURRENCY.IDR:
			return parseQRIS(qrData, sellPrice);
		case CURRENCY.BRL:
			return parsePIX(qrData, sellPrice, { proxyUrl, orderId });
		case CURRENCY.ARS:
			return parseMercadoPago(qrData, sellPrice);
		case CURRENCY.VEN:
			return parsePagoMovil(qrData, sellPrice);
		case CURRENCY.NGN:
			return parseNGN(qrData, sellPrice);
		default:
			return failure("INVALID_CURRENCY", `Currency "${currency}" is not supported`);
	}
}
