import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";

const TRANSFERMOVIL_PREFIX = "TRANSFERMOVIL_ETECSA";

const CARD_INDEX = 2;
const PHONE_INDEX = 3;
const AMOUNT_INDEX = 4;

function normalizePhone(phone: string): string | null {
	const cleaned = phone.replace(/\D/g, "");
	if (/^\d{8}$/.test(cleaned)) return cleaned;
	if (/^53\d{8}$/.test(cleaned)) return cleaned.slice(2);
	return null;
}

function normalizeCard(card: string): string | null {
	const cleaned = card.replace(/[\s-]/g, "");
	return /^\d{16}$/.test(cleaned) ? cleaned : null;
}

/**
 * Parses a Cuban Transfermóvil QR code
 * (`TRANSFERMOVIL_ETECSA,<operation>,<card>,<phone>,<amount>`) and returns the
 * payment address as the compound `phone|card` pair used for CUP. The amount
 * field is optional — when present it is converted to usdc via `sellPrice`.
 */
export function parseTransfermovil(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();
	const parts = trimmed.split(",").map((p) => p.trim());

	if (parts[0]?.toUpperCase() !== TRANSFERMOVIL_PREFIX) {
		return failure("INVALID_QR", "Not a valid Cuban (Transfermóvil) QR code");
	}

	if (parts.length <= PHONE_INDEX) {
		return failure("INVALID_QR", "Transfermóvil QR is missing card or phone fields");
	}

	const card = normalizeCard(parts[CARD_INDEX] ?? "");
	if (!card) {
		return failure("INVALID_QR", "Transfermóvil QR has an invalid card number");
	}

	const phone = normalizePhone(parts[PHONE_INDEX] ?? "");
	if (!phone) {
		return failure("INVALID_QR", "Transfermóvil QR has an invalid phone number");
	}

	const result: ParsedQR = { paymentAddress: `${phone}|${card}` };

	const amountStr = parts[AMOUNT_INDEX];
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
