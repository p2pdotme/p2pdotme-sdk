import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { verifyCRC16 } from "../utils/crc16";
import { extractTags } from "../utils/tlv";

const PHP_TAGS = { AMOUNT: "54", CURRENCY: "53", COUNTRY: "58" } as const;

/**
 * Parses a Philippine QR Ph EMVCo QR. Validates it is a genuine QR Ph
 * (country tag 58 `PH`, currency tag 53 `608`, valid CRC) and returns the raw
 * payload verbatim as `paymentAddress` so the buyer app can re-render the exact
 * QR. Wallet-proprietary GCash-only / Maya-only QRs are not QR Ph and are
 * rejected by the country/currency check. Static QRs carry no amount; when tag
 * 54 is present it is converted to usdc via `sellPrice`.
 */
export function parseQRPh(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	const tags = extractTags(trimmed, [PHP_TAGS.AMOUNT, PHP_TAGS.CURRENCY, PHP_TAGS.COUNTRY]);

	if (tags[PHP_TAGS.COUNTRY] !== "PH" || tags[PHP_TAGS.CURRENCY] !== "608") {
		return failure("INVALID_QR", "Not a valid QR Ph code");
	}

	const crc = verifyCRC16(trimmed);
	if (!crc.valid) {
		return failure("INVALID_QR", crc.error ?? "Invalid QR Ph checksum");
	}

	const result: ParsedQR = { paymentAddress: trimmed };

	const amountStr = tags[PHP_TAGS.AMOUNT];
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
