import { validatePeruvianQr } from "../../country/qr-validator";
import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { extractTags, parseTLV } from "../utils/tlv";

const PEN_TAGS = { AMOUNT: "54", MERCHANT_ACCOUNT: "26" } as const;

/** Sub-tag 00 of tag 26: the issuer's globally unique identifier. */
const ISSUER_GUID_SUBTAG = "00";

/**
 * Issuers (tag 26 GUID) whose dynamic QRs write tag 54 in céntimos with no
 * decimal point, e.g. "27700" for S/ 277.00 (Entel bill payments).
 */
const MINOR_UNIT_ISSUER_GUIDS: ReadonlySet<string> = new Set(["80"]);

const CENTIMOS_PER_SOL = 100;
const INTEGER_AMOUNT = /^\d+$/;

/** True when tag 54 is a céntimos integer from a known minor-unit issuer. */
function isMinorUnitAmount(amountStr: string, merchantAccount: string | undefined): boolean {
	if (!merchantAccount || !INTEGER_AMOUNT.test(amountStr.trim())) return false;
	const guid = parseTLV(merchantAccount).find((e) => e.tag === ISSUER_GUID_SUBTAG)?.value;
	return guid !== undefined && MINOR_UNIT_ISSUER_GUIDS.has(guid);
}

/**
 * Parses a Peruvian Yape/Plin EMVCo QR. Uses the same structural + CRC check
 * as SELL upload (`validatePeruvianQr`: country PE, currency 604, CRC-16).
 * Returns the raw payload verbatim as `paymentAddress` so the merchant can
 * re-render the exact QR. Static QRs carry no amount; tag 54 converts via
 * `sellPrice`, scaled down from céntimos for issuers that encode it that way.
 */
export function parsePeru(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	if (!validatePeruvianQr(trimmed)) {
		return failure("INVALID_QR", "Not a valid Peru Yape/Plin QR");
	}

	const tags = extractTags(trimmed, [PEN_TAGS.AMOUNT, PEN_TAGS.MERCHANT_ACCOUNT]);
	const result: ParsedQR = { paymentAddress: trimmed };

	const amountStr = tags[PEN_TAGS.AMOUNT];
	if (amountStr) {
		const parsed = parseAmount(amountStr, sellPrice);
		if (!parsed) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		if (isMinorUnitAmount(amountStr, tags[PEN_TAGS.MERCHANT_ACCOUNT])) {
			const fiat = parsed.fiat / CENTIMOS_PER_SOL;
			result.amount = { fiat, usdc: fiat / sellPrice };
		} else {
			result.amount = parsed;
		}
	}

	return success(result);
}
