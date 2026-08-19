import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { extractTags } from "../utils/tlv";

const BOB_TAGS = { AMOUNT: "54", CURRENCY: "53", COUNTRY: "58" } as const;

/**
 * Parses a Bolivian QR Simple EMVCo QR. Validates it is a genuine Bolivia QR
 * (country tag 58 `BO`, currency tag 53 `068`) and returns the raw payload verbatim
 * as `paymentAddress` so the buyer app can re-render the exact QR. Static QRs carry
 * no amount; when tag 54 is present it is converted to usdc via `sellPrice`.
 */
export function parseBolivia(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	const tags = extractTags(trimmed, [BOB_TAGS.AMOUNT, BOB_TAGS.CURRENCY, BOB_TAGS.COUNTRY]);

	if (tags[BOB_TAGS.COUNTRY] !== "BO" || tags[BOB_TAGS.CURRENCY] !== "068") {
		return failure("INVALID_QR", "Not a valid Bolivia QR Simple QR");
	}

	const result: ParsedQR = { paymentAddress: trimmed };

	const amountStr = tags[BOB_TAGS.AMOUNT];
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
