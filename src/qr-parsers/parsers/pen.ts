import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { extractTags } from "../utils/tlv";

const PEN_TAGS = { AMOUNT: "54", CURRENCY: "53", COUNTRY: "58" } as const;

/**
 * Parses a Peruvian Yape/Plin EMVCo QR. Validates it is a genuine Peru QR
 * (country tag 58 `PE`, currency tag 53 `604`) and returns the raw payload verbatim
 * as `paymentAddress` so the buyer app can re-render the exact QR. Static QRs carry
 * no amount; when tag 54 is present it is converted to usdc via `sellPrice`.
 */
export function parsePeru(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	const tags = extractTags(trimmed, [PEN_TAGS.AMOUNT, PEN_TAGS.CURRENCY, PEN_TAGS.COUNTRY]);

	if (tags[PEN_TAGS.COUNTRY] !== "PE" || tags[PEN_TAGS.CURRENCY] !== "604") {
		return failure("INVALID_QR", "Not a valid Peru Yape/Plin QR");
	}

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
