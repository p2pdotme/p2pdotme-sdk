/**
 * QR payload checks for **SELL collection** (seller/merchant uploads a QR).
 *
 * Why this file exists: user-app and merchant-app share the same “is this
 * blob a payment QR we can store?” rules. Keeping them here means the apps
 * call `CountryOption.validateQr` instead of copying peru/ven parsers.
 *
 * This is not `@p2pdotme/sdk/qr-parsers`. Parsers are Scan & Pay: they
 * pull amount/address out of a live scan. Upload is stricter — a bad file
 * must not become the stored payment ID.
 *
 * Image → string stays in the apps (`qr-scanner` needs a File / canvas).
 * This module only sees the decoded payload string.
 */
import { PACKED_PAYMENT_ID_SEP } from "./types";

function crc16ccitt(s: string): string {
	let crc = 0xffff;
	for (let i = 0; i < s.length; i++) {
		crc ^= s.charCodeAt(i) << 8;
		for (let j = 0; j < 8; j++) {
			crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
			crc &= 0xffff;
		}
	}
	return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Yape/Plin EMVCo: country PE, currency 604, CRC-16/CCITT-FALSE.
 * CRC is required on upload so we never persist a truncated screenshot.
 * (PAY render in the merchant is looser; that path does not use this.)
 */
export function validatePeruvianQr(payload: string): boolean {
	if (!payload || payload.trim().length === 0) return false;
	const data = payload.trim();

	const tags: Record<string, string> = {};
	let pos = 0;
	while (pos + 4 <= data.length) {
		const tag = data.substring(pos, pos + 2);
		const lengthStr = data.substring(pos + 2, pos + 4);
		if (!/^[0-9]{2}$/.test(tag) || !/^[0-9]{2}$/.test(lengthStr)) break;
		const length = Number.parseInt(lengthStr, 10);
		if (pos + 4 + length > data.length) break;
		tags[tag] = data.substring(pos + 4, pos + 4 + length);
		pos += 4 + length;
	}

	if (tags["58"] !== "PE") return false;
	if (tags["53"] !== "604") return false;

	const crcTag = tags["63"];
	if (!crcTag) return false;

	const marker = data.lastIndexOf("6304");
	if (marker === -1) return false;

	const expected = crc16ccitt(data.substring(0, marker + 4));
	return expected.toUpperCase() === crcTag.toUpperCase();
}

/**
 * Suiche 7B / Pago Móvil collection QR: `base64?merchantId=NNNN&…`.
 * The base64 is bank AES — we cannot decode phone/RIF from it, only the
 * envelope. Reject packed `||` IDs so a stored compound string is never
 * treated as a QR. Scan & Pay uses the looser `isPagoMovilQr` envelope.
 */
export function validateVenezuelanQr(payload: string): boolean {
	if (!payload || typeof payload !== "string") return false;
	const trimmed = payload.trim();
	if (trimmed.includes(PACKED_PAYMENT_ID_SEP)) return false;
	const qIdx = trimmed.indexOf("?");
	if (qIdx < 40) return false;
	const blob = trimmed.substring(0, qIdx);
	if (!/^[A-Za-z0-9+/=]+$/.test(blob)) return false;
	return /(?:^|[?&])merchantId=\d{3,4}(?:&|$)/.test(trimmed.substring(qIdx));
}
