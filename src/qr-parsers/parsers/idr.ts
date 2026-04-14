import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { extractTags } from "../utils/tlv";

const QRIS_TAGS = { AMOUNT: "54", MERCHANT_NAME: "59" } as const;

export function parseQRIS(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	const tags = extractTags(trimmed, [QRIS_TAGS.AMOUNT, QRIS_TAGS.MERCHANT_NAME]);

	const merchantName = tags[QRIS_TAGS.MERCHANT_NAME];
	if (!merchantName) {
		return failure("INVALID_QR", "Missing merchant name");
	}

	const result: ParsedQR = { paymentAddress: merchantName };

	const amountStr = tags[QRIS_TAGS.AMOUNT];
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
