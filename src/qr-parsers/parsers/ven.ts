import { validateVenezuelanQr } from "../../country/qr-validator";
import type { ParseResult } from "../types";
import { failure, success } from "../types";

/**
 * Same envelope as SELL upload: opaque `base64?merchantId=NNNN` (blob ≥ 40).
 * Prefer `validateVenezuelanQr` from `@p2pdotme/sdk/country`; this alias stays
 * for `@p2pdotme/sdk/qr-parsers` callers.
 */
export function isPagoMovilQr(qrData: string): boolean {
	return validateVenezuelanQr(qrData);
}

/**
 * Parses a Venezuelan Pago Móvil / Suiche 7B QR. Uses the same envelope as
 * SELL upload (`validateVenezuelanQr`). Returns the raw payload verbatim as
 * `paymentAddress` so the merchant can re-render the exact QR.
 */
export function parsePagoMovil(qrData: string, _sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	if (!validateVenezuelanQr(trimmed)) {
		return failure("INVALID_QR", "Not a valid Venezuelan QR code");
	}

	return success({ paymentAddress: trimmed });
}
