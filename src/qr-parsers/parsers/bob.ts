import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { extractTags } from "../utils/tlv";

const BOB_TAGS = { AMOUNT: "54", CURRENCY: "53", COUNTRY: "58" } as const;

/**
 * Bolivia QR Simple encrypted envelope: `<base64 ciphertext>|<32-hex checksum>`
 * (Yape Bs, BancoSol dynamic QR). The payload is bank-encrypted, so amount/account
 * cannot be read — the buyer re-renders the exact blob for their bank app to scan.
 */
function isBolivianEncryptedQr(payload: string): boolean {
	if (payload.includes("||")) return false;
	const sep = payload.lastIndexOf("|");
	if (sep < 40) return false;
	const blob = payload.slice(0, sep);
	const tag = payload.slice(sep + 1);
	if (blob.length % 4 !== 0) return false;
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(blob)) return false;
	return /^[0-9A-Fa-f]{32}$/.test(tag);
}

/**
 * Parses a Bolivian QR Simple QR. Accepts either the encrypted envelope
 * (`<base64>|<32-hex>`) or an EMVCo static QR (country tag 58 `BO`, currency tag
 * 53 `068`). Returns the raw payload verbatim as `paymentAddress` so the buyer app
 * can re-render the exact QR. Static EMVCo QRs carry no amount unless tag 54 is
 * present, which is converted to usdc via `sellPrice`; encrypted QRs carry none.
 */
export function parseBolivia(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	if (isBolivianEncryptedQr(trimmed)) {
		return success({ paymentAddress: trimmed });
	}

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
