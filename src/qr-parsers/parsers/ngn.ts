import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { verifyCRC16 } from "../utils/crc16";
import { extractTags, parseTLV } from "../utils/tlv";

const NGN_TAGS = {
	AMOUNT: "54",
	CURRENCY: "53",
	COUNTRY: "58",
	MERCHANT_NAME: "59",
} as const;

const NGN_CURRENCY_CODE = "566";
const NIBSS_AID = "NG.COM.NIBSSPLC.QR";

function isNQR(qrData: string): boolean {
	if (qrData.includes(NIBSS_AID)) return true;
	if (qrData.includes(`5303${NGN_CURRENCY_CODE}`)) return true;
	if (qrData.includes("5802NG")) return true;
	return false;
}

function parseEMVCoNQR(qrData: string, sellPrice: number): ParseResult {
	const crc = verifyCRC16(qrData);
	if (!crc.valid) {
		return failure("INVALID_QR", "Invalid QR checksum");
	}

	if (!isNQR(qrData)) {
		return failure("INVALID_QR", "Not a Nigerian (NQR) QR code");
	}

	const tags = extractTags(qrData, [NGN_TAGS.AMOUNT, NGN_TAGS.MERCHANT_NAME]);

	const merchantName = tags[NGN_TAGS.MERCHANT_NAME];
	if (!merchantName) {
		return failure("INVALID_QR", "Missing merchant name");
	}

	const result: ParsedQR = { paymentAddress: merchantName };

	const amountStr = tags[NGN_TAGS.AMOUNT];
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}

function parseSPD(qrData: string, sellPrice: number): ParseResult {
	// Short Payment Descriptor (Czech spec). Seen in the wild for some
	// Nigerian account-based QRs: `SPD*1.0*ACC:<nuban>*AM:<amount>*MSG:<text>*`.
	const parts = qrData.split("*").filter((p) => p.length > 0);
	if (parts.length < 2 || parts[0] !== "SPD") {
		return failure("INVALID_QR", "Not a valid SPD QR code");
	}

	const fields: Record<string, string> = {};
	for (const part of parts.slice(2)) {
		const colon = part.indexOf(":");
		if (colon === -1) continue;
		fields[part.substring(0, colon).toUpperCase()] = part.substring(colon + 1);
	}

	const account = fields.ACC;
	if (!account) {
		return failure("INVALID_QR", "Missing ACC field in SPD QR");
	}

	const result: ParsedQR = { paymentAddress: account };

	const amountStr = fields.AM;
	if (amountStr) {
		const amount = parseAmount(amountStr.replace(/,/g, ""), sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}

/**
 * Parses a Nigerian QR code. Supports NIBSS NQR (EMVCo MPM with AID
 * `NG.COM.NIBSSPLC.QR`) and the SPD `SPD*1.0*ACC:...*AM:...*` format.
 */
export function parseNGN(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	if (trimmed.startsWith("SPD*")) {
		return parseSPD(trimmed, sellPrice);
	}

	// Sanity-check that this looks like EMVCo TLV before CRC-ing.
	if (parseTLV(trimmed).length === 0) {
		return failure("INVALID_QR", "Not a valid Nigerian QR code");
	}

	return parseEMVCoNQR(trimmed, sellPrice);
}
