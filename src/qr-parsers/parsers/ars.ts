import type { ParseResult } from "../types";
import { failure, success } from "../types";
import { verifyCRC16 } from "../utils/crc16";
import { extractTags } from "../utils/tlv";

export function parseMercadoPago(qrData: string, _sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	const isARS = trimmed.includes("5303032");
	const isAR = trimmed.includes("5802AR");
	if (!isARS && !isAR) {
		return failure("INVALID_QR", "Not an ARS/Argentina QR code");
	}

	const crc = verifyCRC16(trimmed);
	if (!crc.valid) {
		return failure("INVALID_QR", "Invalid QR checksum");
	}

	const tags = extractTags(trimmed, ["59"]);
	const merchantName = tags["59"] || "Unknown";

	return success({ paymentAddress: merchantName });
}
