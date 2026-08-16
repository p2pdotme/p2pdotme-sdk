import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const PEN_PLACEHOLDER = "Yape/Plin QR or 20-digit CCI";
export const PEN_VALIDATION_ERROR = "Please upload a valid Yape/Plin QR or enter a 20-digit CCI";

/**
 * Validates a Peruvian payment key for the SELL text-key path (legacy).
 * Accepts either a 20-digit CCI (Código de Cuenta Interbancario, spaces ignored)
 * or a Yape/Plin phone number (optional `+51`/`51` prefix, then `9` + 8 digits).
 */
export function validatePeruvianPaymentKey(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	const trimmed = value.trim();

	const cci = trimmed.replace(/\s+/g, "");
	if (/^\d{20}$/.test(cci)) return true;

	const phone = trimmed.replace(/\s+/g, "").replace(/^\+?51/, "");
	if (/^9\d{8}$/.test(phone)) return true;

	return false;
}

/**
 * Computes CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflection, xorout 0)
 * over the input string and returns the 4-char uppercase hex checksum.
 */
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
 * Validates a Yape/Plin EMVCo QR payload: parseable TLV, country (tag 58) `PE`,
 * currency (tag 53) `604` (PEN), and a matching CRC-16/CCITT-FALSE (tag 63).
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

/** Payment ID field configuration for PEN (Peru, Yape / Plin / CCI). */
export const PEN_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "paymentId",
		label: "CCI_YAPE_PLIN",
		placeholder: PEN_PLACEHOLDER,
		displayLabel: "Yape / Plin / CCI",
		// Prefer EMVCo QR payloads (sell/pay QR flow). CCI (and legacy phone)
		// still validates so bank-transfer and older address-book entries work.
		validate: (value) => validatePeruvianQr(value) || validatePeruvianPaymentKey(value),
		validationErrorMessage: PEN_VALIDATION_ERROR,
	},
];

/** Country option for Peru (PEN). */
export const PEN_COUNTRY_OPTION: CountryOption = {
	country: "Peru",
	currency: CURRENCY.PEN,
	symbolNative: "S/",
	locale: "es-PE",
	paymentMethod: "YAPE_PLIN_CCI",
	paymentAddressName: "YAPE_PLIN_CCI_DETAILS",
	timezone: "America/Lima",
	timezone_name: "PET",
	flag: "🇵🇪",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1f5-1f1ea.png",
	phoneCode: "+51",
	telegramSupportChannel: "https://t.me/p2pmeperu",
	twitterUsername: "p2pmePeru",
	smsCountryCodes: ["PE"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: [],
};
