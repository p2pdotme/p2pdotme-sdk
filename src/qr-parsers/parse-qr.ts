import { CURRENCY, getCountryOption } from "../country";
import { parseMercadoPago } from "./parsers/ars";
import { parseBolivia } from "./parsers/bob";
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
 *
 * When the country has `validateQr` (PEN, VEN, BOB), Scan & Pay must pass the
 * same check as SELL upload — not a looser envelope.
 */
export async function parseQR(params: ParseQRParams): Promise<ParseResult> {
	const { qrData, currency, sellPrice, proxyUrl, orderId } = params;

	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	let result: ParseResult;
	switch (currency) {
		case CURRENCY.INR:
			result = parseUPI(qrData, sellPrice);
			break;
		case CURRENCY.IDR:
			result = parseQRIS(qrData, sellPrice);
			break;
		case CURRENCY.BRL:
			result = await parsePIX(qrData, sellPrice, { proxyUrl, orderId });
			break;
		case CURRENCY.ARS:
			result = parseMercadoPago(qrData, sellPrice);
			break;
		case CURRENCY.VEN:
			result = parsePagoMovil(qrData, sellPrice);
			break;
		case CURRENCY.BOB:
			result = parseBolivia(qrData, sellPrice);
			break;
		case CURRENCY.NGN:
			result = parseNGN(qrData, sellPrice);
			break;
		case CURRENCY.COP:
			result = parseCOP(qrData, sellPrice);
			break;
		case CURRENCY.CUP:
			result = parseTransfermovil(qrData, sellPrice);
			break;
		case CURRENCY.ECU:
			result = parseDeUna(qrData, sellPrice);
			break;
		case CURRENCY.PEN:
			result = parsePeru(qrData, sellPrice);
			break;
		case CURRENCY.PHP:
			result = parseQRPh(qrData, sellPrice);
			break;
		default:
			return failure("INVALID_CURRENCY", `Currency "${currency}" is not supported`);
	}

	const validateQr = getCountryOption(currency)?.validateQr;
	if (result.isOk() && validateQr && !validateQr(qrData.trim())) {
		return failure("INVALID_QR", "QR does not match catalog validateQr");
	}

	return result;
}
