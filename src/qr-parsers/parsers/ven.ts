import type { ParseResult } from "../types";
import { failure, success } from "../types";

/**
 * Envelope check for a Pago Móvil / Suiche 7B scan: opaque `base64?…`.
 * PAY stores this whole string as the payment ID so the merchant can
 * re-encode it as a QR. Stricter SELL upload rules live in `validateVenezuelanQr`.
 */
export function isPagoMovilQr(qrData: string): boolean {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return false;
	}

	const trimmed = qrData.trim();
	const qIdx = trimmed.indexOf("?");
	if (qIdx === -1) return false;

	const payload = trimmed.substring(0, qIdx);
	return !!payload && /^[A-Za-z0-9+/=]+$/.test(payload);
}

export function parsePagoMovil(qrData: string, _sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	if (!isPagoMovilQr(trimmed)) {
		return failure("INVALID_QR", "Not a valid Venezuelan QR code");
	}

	return success({ paymentAddress: trimmed });
}
