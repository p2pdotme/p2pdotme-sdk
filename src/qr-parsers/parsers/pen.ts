import { validatePeruvianQr } from "../../country/qr-validator";
import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { extractTags } from "../utils/tlv";

const PEN_TAGS = { AMOUNT: "54" } as const;

/**
 * Parses a Peruvian Yape/Plin EMVCo QR. Uses the same structural + CRC check
 * as SELL upload (`validatePeruvianQr`: country PE, currency 604, CRC-16).
 * Returns the raw payload verbatim as `paymentAddress` so the merchant can
 * re-render the exact QR. Static QRs carry no amount; tag 54 converts via
 * `sellPrice`.
 */
export function parsePeru(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	if (!validatePeruvianQr(trimmed)) {
		return failure("INVALID_QR", "Not a valid Peru Yape/Plin QR");
	}

	const tags = extractTags(trimmed, [PEN_TAGS.AMOUNT]);
	const result: ParsedQR = { paymentAddress: trimmed };

	const amountStr = tags[PEN_TAGS.AMOUNT];
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
