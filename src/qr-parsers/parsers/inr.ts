import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";

const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

export function parseUPI(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	let paramString: string;
	if (trimmed.startsWith("upi://pay?")) {
		paramString = trimmed.substring(10);
	} else if (trimmed.includes("?")) {
		paramString = trimmed.split("?")[1];
	} else {
		paramString = trimmed;
	}

	const params = new URLSearchParams(paramString);
	const pa = params.get("pa");

	if (!pa) {
		return failure("INVALID_QR", "Missing UPI payment address");
	}

	if (!UPI_ID_REGEX.test(pa)) {
		return failure("INVALID_QR", "Invalid UPI ID format");
	}

	const result: ParsedQR = { paymentAddress: pa };

	const amountStr = params.get("am");
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
