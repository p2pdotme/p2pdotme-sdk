import type { ParseResult } from "../types";
import { failure, success } from "../types";

export function parsePagoMovil(qrData: string, _sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	const qIdx = trimmed.indexOf("?");
	if (qIdx === -1) {
		return failure("INVALID_QR", "Not a valid Venezuelan QR code");
	}

	const payload = trimmed.substring(0, qIdx);

	if (!payload || !/^[A-Za-z0-9+/=]+$/.test(payload)) {
		return failure("INVALID_QR", "Not a valid Venezuelan QR code");
	}

	return success({ paymentAddress: trimmed });
}
