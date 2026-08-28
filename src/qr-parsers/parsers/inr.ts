import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { verifyCRC16 } from "../utils/crc16";
import { extractTags } from "../utils/tlv";

const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

const FONEPAY_COUNTRY_TAG = "58" as const;

/**
 * Fonepay (Nepal NPQR) EMVCo QR. Indian UPI apps can pay these through the
 * NPCI–Fonepay cross-border link, so an INR PAY order accepts them. Detected by
 * the `fonepay.com` reverse-domain marker (merchant account template, tag 26),
 * country tag 58 = `NP`, and a valid EMVCo CRC-16.
 */
function isFonepayQr(payload: string): boolean {
	if (!payload.includes("fonepay.com")) return false;
	if (!verifyCRC16(payload).valid) return false;
	return extractTags(payload, [FONEPAY_COUNTRY_TAG])[FONEPAY_COUNTRY_TAG] === "NP";
}

export function parseUPI(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	// Fonepay (Nepal) EMVCo QR — returned verbatim as `paymentAddress` so the
	// payer's UPI app can re-render and scan the exact merchant QR. Any embedded
	// amount (tag 54) is denominated in NPR, not INR, so it is not read; the
	// payer enters the amount in their app.
	if (isFonepayQr(trimmed)) {
		return success({ paymentAddress: trimmed });
	}

	let paramString: string;
	if (trimmed.startsWith("upi://pay?")) {
		paramString = trimmed.substring(10);
	} else if (trimmed.includes("?")) {
		paramString = trimmed.split("?")[1];
	} else {
		paramString = trimmed;
	}

	const params = new URLSearchParams(paramString);
	const pa = params.get("pa");

	if (!pa) {
		return failure("INVALID_QR", "Missing UPI payment address");
	}

	if (!UPI_ID_REGEX.test(pa)) {
		return failure("INVALID_QR", "Invalid UPI ID format");
	}

	const result: ParsedQR = { paymentAddress: pa };

	const amountStr = params.get("am");
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
