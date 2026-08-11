import { CURRENCY } from "../country";
import { parseMercadoPago } from "./parsers/ars";
import { parsePIX } from "./parsers/brl";
import { parseCOP } from "./parsers/cop";
import { parseTransfermovil } from "./parsers/cup";
import { parseDeUna } from "./parsers/ecu";
import { parseQRIS } from "./parsers/idr";
import { parseUPI } from "./parsers/inr";
import { parseNGN } from "./parsers/ngn";
import { parsePeru } from "./parsers/pen";
import { parseQRPh } from "./parsers/php";
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
 * (UPI, QRIS, QR Ph, MercadoPago, PagoMovil, Transfermóvil) and static PIX are synchronous and
 * resolve immediately.
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
		case CURRENCY.COP:
			return parseCOP(qrData, sellPrice);
		case CURRENCY.CUP:
			return parseTransfermovil(qrData, sellPrice);
		case CURRENCY.ECU:
			return parseDeUna(qrData, sellPrice);
		case CURRENCY.PEN:
			return parsePeru(qrData, sellPrice);
		case CURRENCY.PHP:
			return parseQRPh(qrData, sellPrice);
		default:
			return failure("INVALID_CURRENCY", `Currency "${currency}" is not supported`);
	}
}
