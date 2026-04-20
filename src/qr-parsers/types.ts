import { err, ok, type Result } from "neverthrow";
import { COUNTRY_OPTIONS } from "../country";
import type { CurrencyCode } from "../types";
import { QRParserError, type QRParserErrorCode } from "./errors";

/** Currencies that support QR parsing — derived from countries where PAY is not disabled. */
export const SUPPORTED_QR_CURRENCIES: readonly CurrencyCode[] = COUNTRY_OPTIONS.filter(
	(c) => !c.disabledPaymentTypes.includes("PAY"),
).map((c) => c.currency);

export type SupportedCurrency = (typeof SUPPORTED_QR_CURRENCIES)[number];

/** Internal — options forwarded to per-currency parsers (today, only PIX uses them). */
export interface ParseQRConfig {
	proxyUrl?: string;
	orderId?: string;
}

/** Single-object params for `parseQR`. */
export interface ParseQRParams {
	readonly qrData: string;
	readonly currency: SupportedCurrency;
	/** Exchange rate: 1 USDC = `sellPrice` fiat. */
	readonly sellPrice: number;
	/** Required for dynamic PIX (BRL) QRs to bypass CORS on the bank endpoint. */
	readonly proxyUrl?: string;
	/** Forwarded to `proxyUrl` for tracing / correlation. */
	readonly orderId?: string;
}

export interface ParsedQR {
	paymentAddress: string;
	amount?: {
		usdc: number;
		fiat: number;
	};
}

export type ParseResult = Result<ParsedQR, QRParserError>;

export function success(data: ParsedQR): ParseResult {
	return ok(data);
}

export function failure(
	code: QRParserErrorCode,
	message: string,
	context?: Record<string, unknown>,
): ParseResult {
	return err(new QRParserError(message, { code, context }));
}
