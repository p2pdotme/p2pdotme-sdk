/**
 * QR payload checks for **SELL collection** (seller/merchant uploads a QR).
 *
 * Why this file exists: user-app and merchant-app share the same “is this
 * blob a payment QR we can store?” rules. Keeping them here means the apps
 * call `CountryOption.validateQr` instead of copying peru/ven parsers.
 *
 * This is not `@p2pdotme/sdk/qr-parsers`. Parsers are Scan & Pay: they
 * pull amount/address out of a live scan. Peru Scan & Pay (`parsePeru`)
 * reuses `validatePeruvianQr` so a bad CRC cannot become the stored ID.
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
 * Structural EMVCo upload check: parseable TLV, country tag 58, currency tag 53,
 * and a matching CRC-16/CCITT-FALSE (tag 63). CRC is required on upload so we
 * never persist a truncated screenshot. `getPayQrPayload` may still re-draw a
 * stored blob whose CRC later fails.
 */
function validateEmvcoQr(payload: string, country: string, currency: string): boolean {
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

	if (tags["58"] !== country) return false;
	if (tags["53"] !== currency) return false;

	const crcTag = tags["63"];
	if (!crcTag) return false;

	const marker = data.lastIndexOf("6304");
	if (marker === -1) return false;

	const expected = crc16ccitt(data.substring(0, marker + 4));
	return expected.toUpperCase() === crcTag.toUpperCase();
}

/**
 * Yape/Plin EMVCo: country PE, currency 604, CRC-16/CCITT-FALSE.
 * Same rule for SELL upload and Scan & Pay (`parsePeru`).
 * `getPayQrPayload` may still re-draw a stored blob whose CRC later fails.
 */
export function validatePeruvianQr(payload: string): boolean {
	return validateEmvcoQr(payload, "PE", "604");
}

/**
 * Bolivia QR Simple encrypted envelope (Yape Bs, BancoSol, Banco Fie dynamic QR,
 * etc.): `<base64 ciphertext>|<hex checksum>`. The payload is bank-encrypted so we
 * cannot read account/amount — we only validate the envelope shape and store it
 * verbatim to re-render. The checksum is a hex digest whose length varies by bank
 * (24 hex for Banco Fie, 32 hex for Yape/BancoSol). Reject packed `||` IDs so a
 * stored compound string is never mistaken for a QR.
 */
function isBolivianEncryptedQr(payload: string): boolean {
	const trimmed = payload.trim();
	if (trimmed.includes(PACKED_PAYMENT_ID_SEP)) return false;
	const sep = trimmed.lastIndexOf("|");
	if (sep < 40) return false;
	const blob = trimmed.slice(0, sep);
	const tag = trimmed.slice(sep + 1);
	if (blob.length % 4 !== 0) return false;
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(blob)) return false;
	return /^(?:[0-9A-Fa-f]{24}|[0-9A-Fa-f]{32})$/.test(tag);
}

/**
 * Bolivia QR Simple. Accepts either the encrypted envelope (Yape Bs, BancoSol
 * dynamic QR — `<base64>|<32-hex>`) or an EMVCo static QR (country BO, currency
 * 068, CRC-16/CCITT-FALSE). CRC / envelope shape is required on upload so we
 * never persist a truncated screenshot.
 */
export function validateBolivianQr(payload: string): boolean {
	if (!payload || payload.trim().length === 0) return false;
	return isBolivianEncryptedQr(payload) || validateEmvcoQr(payload, "BO", "068");
}

/**
 * Suiche 7B / Pago Móvil collection QR: `base64?merchantId=NNNN&…`.
 * The base64 is bank AES — we cannot decode phone/RIF from it, only the
 * envelope. Reject packed `||` IDs so a stored compound string is never
 * treated as a QR. Same rule for SELL upload and Scan & Pay (`parsePagoMovil`).
 * `getPayQrPayload` may still re-draw a stored blob without `merchantId`.
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

/** Left side of `qr||fields`, or the whole string when not packed. */
export function payQrCandidate(paymentId: string): string {
	const trimmed = paymentId.trim();
	const sep = trimmed.indexOf(PACKED_PAYMENT_ID_SEP);
	return (sep >= 0 ? trimmed.slice(0, sep) : trimmed).trim();
}

/**
 * PAY display: Yape/Plin EMVCo (PE / 604) even when CRC fails.
 * SELL upload still uses `validatePeruvianQr`.
 */
export function isPeruvianPayQr(payload: string): boolean {
	if (!payload.startsWith("0002")) return false;
	return payload.includes("5802PE") && payload.includes("5303604");
}

/**
 * PAY display: Pago Móvil envelope `base64?…` without requiring merchantId.
 * SELL upload still uses `validateVenezuelanQr`.
 */
export function isVenezuelanPayQr(payload: string): boolean {
	if (!payload || payload.includes(PACKED_PAYMENT_ID_SEP)) return false;
	const qIdx = payload.indexOf("?");
	if (qIdx === -1) return false;
	const blob = payload.slice(0, qIdx);
	return blob.length > 0 && /^[A-Za-z0-9+/=]+$/.test(blob);
}

/**
 * PAY display: QR Ph EMVCo (PH / 608). SELL PHP is `phone|bank-name`, not a QR.
 * CRC is not required here — Scan & Pay already gated it on create.
 */
export function isPhilippinePayQr(payload: string): boolean {
	if (!payload.startsWith("0002")) return false;
	return payload.includes("5802PH") && payload.includes("5303608");
}

/**
 * PAY display: Fonepay (Nepal NPQR) EMVCo QR. INR PAY orders accept these
 * through the NPCI–Fonepay cross-border link, so the payer's UPI app can scan
 * the exact merchant QR. Detected by the `fonepay.com` reverse-domain marker
 * and country tag 58 = NP. SELL INR is a plain UPI ID, not a QR.
 * CRC is not required here — Scan & Pay already gated it on create.
 */
export function isNepalFonepayQr(payload: string): boolean {
	if (!payload.startsWith("0002")) return false;
	return payload.includes("fonepay.com") && payload.includes("5802NP");
}

/**
 * PAY display: Bolivia QR Simple. EMVCo (BO / 068) even when CRC fails, or an
 * encrypted envelope `<base64>|<hex>` with a looser checksum than SELL upload
 * (16–64 hex vs 24/32). SELL still uses `validateBolivianQr`.
 */
export function isBolivianPayQr(payload: string): boolean {
	if (!payload || payload.includes(PACKED_PAYMENT_ID_SEP)) return false;
	if (payload.startsWith("0002") && payload.includes("5802BO") && payload.includes("5303068")) {
		return true;
	}
	const sep = payload.lastIndexOf("|");
	if (sep < 40) return false;
	const blob = payload.slice(0, sep);
	const tag = payload.slice(sep + 1);
	if (blob.length % 4 !== 0) return false;
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(blob)) return false;
	return /^[0-9A-Fa-f]{16,64}$/.test(tag);
}
