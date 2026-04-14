/**
 * Calculate CRC-16-CCITT-FALSE checksum.
 * Polynomial 0x1021, initial value 0xFFFF.
 * Used by EMVCo-compliant QR codes (PIX, MercadoPago).
 */
export function calculateCRC16(data: string): string {
	const payload = `${data}6304`;
	const polynomial = 0x1021;
	let result = 0xffff;

	const encoder = new TextEncoder();
	const bytes = encoder.encode(payload);

	for (let offset = 0; offset < bytes.length; offset++) {
		result ^= bytes[offset] << 8;
		for (let bitwise = 0; bitwise < 8; bitwise++) {
			result <<= 1;
			if (result & 0x10000) {
				result ^= polynomial;
			}
			result &= 0xffff;
		}
	}

	return result.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Verify CRC-16 checksum of an EMVCo QR string.
 * Expects the string to end with "6304" + 4 hex CRC digits.
 */
export function verifyCRC16(qrData: string): { valid: boolean; error?: string } {
	if (!qrData || qrData.length < 8) {
		return { valid: false, error: "QR data too short for CRC verification" };
	}

	const crcTagIndex = qrData.lastIndexOf("6304");
	if (crcTagIndex === -1 || crcTagIndex + 8 !== qrData.length) {
		return { valid: false, error: "Missing or misplaced CRC tag (6304)" };
	}

	const providedCrc = qrData.substring(crcTagIndex + 4, crcTagIndex + 8);
	if (!/^[0-9A-Fa-f]{4}$/.test(providedCrc)) {
		return { valid: false, error: "Invalid CRC hex format" };
	}

	const dataBeforeCrc = qrData.substring(0, crcTagIndex);
	const calculatedCrc = calculateCRC16(dataBeforeCrc);

	if (calculatedCrc !== providedCrc.toUpperCase()) {
		return {
			valid: false,
			error: `CRC mismatch: expected ${calculatedCrc}, got ${providedCrc.toUpperCase()}`,
		};
	}

	return { valid: true };
}
