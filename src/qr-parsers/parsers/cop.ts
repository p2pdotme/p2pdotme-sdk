import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { extractTags } from "../utils/tlv";

const COP_CURRENCY_CODE = "5303170";
const CO_COUNTRY_CODE = "5802CO";

const DIAN_KEYS = ["NumFac", "CUFE", "Cufe", "NitFac", "ValFac", "ValTolFac"] as const;

function parseDianInvoice(qrData: string): ParseResult | null {
	const hasDianMarker = DIAN_KEYS.some(
		(k) => qrData.includes(`${k}:`) || qrData.includes(`${k} :`),
	);
	if (!hasDianMarker) return null;

	const fields: Record<string, string> = {};
	const segments = qrData.split(/[\n,;]+/);
	for (const segment of segments) {
		const idx = segment.indexOf(":");
		if (idx === -1) continue;
		const key = segment.substring(0, idx).trim();
		const value = segment.substring(idx + 1).trim();
		if (key && value && !fields[key]) fields[key] = value;
	}

	const cufe = fields.CUFE || fields.Cufe || fields.cufe;
	const numFac = fields.NumFac;
	const paymentAddress = cufe || numFac;

	if (!paymentAddress) {
		return failure("INVALID_QR", "Missing CUFE / NumFac in DIAN invoice QR");
	}

	return success({ paymentAddress });
}

function parseColombianEMV(qrData: string, sellPrice: number): ParseResult | null {
	const isCO = qrData.includes(CO_COUNTRY_CODE);
	const isCOP = qrData.includes(COP_CURRENCY_CODE);
	if (!isCO || !isCOP) return null;

	const tags = extractTags(qrData, ["54", "59"]);
	const merchantName = tags["59"] || "MERCHANT_NOT_FOUND";

	const result: ParsedQR = { paymentAddress: merchantName };

	const amountStr = tags["54"];
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (amount) result.amount = amount;
	}

	return success(result);
}

/**
 * Parses a Colombian QR. Supports DIAN electronic invoice QRs
 * (key:value text with `CUFE`/`NumFac`) and EMVCo-encoded QRs from
 * Colombian payment networks (Nequi, Bre-B/RBM) identified by country
 * `5802CO` and currency `5303170`.
 */
export function parseCOP(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	const dian = parseDianInvoice(trimmed);
	if (dian) return dian;

	const emv = parseColombianEMV(trimmed, sellPrice);
	if (emv) return emv;

	return failure("INVALID_QR", "Not a recognized Colombian QR code");
}
