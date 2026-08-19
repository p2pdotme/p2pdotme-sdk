import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const BOB_PLACEHOLDER = "Bank account number (8–20 digits)";
export const BOB_VALIDATION_ERROR = "Please enter a valid Bolivian bank account number";

/**
 * Validates a Bolivian bank account number for QR Simple transfers.
 * Accepts 8–20 digits; spaces and dashes are ignored.
 */
export function validateBolivianAccount(account: string): boolean {
	if (!account || account.trim().length === 0) return false;
	const cleaned = account.trim().replace(/[\s-]/g, "");
	return /^\d{8,20}$/.test(cleaned);
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
 * Validates a Bolivian QR Simple EMVCo payload: parseable TLV, country (tag 58) `BO`,
 * currency (tag 53) `068` (BOB), and a matching CRC-16/CCITT-FALSE (tag 63).
 */
export function validateBolivianQr(payload: string): boolean {
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

	if (tags["58"] !== "BO") return false;
	if (tags["53"] !== "068") return false;

	const crcTag = tags["63"];
	if (!crcTag) return false;

	const marker = data.lastIndexOf("6304");
	if (marker === -1) return false;

	const expected = crc16ccitt(data.substring(0, marker + 4));
	return expected.toUpperCase() === crcTag.toUpperCase();
}

/** Payment ID field configuration for BOB (Bolivia, QR Simple). */
export const BOB_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "account",
		label: "ACCOUNT_NUMBER",
		placeholder: BOB_PLACEHOLDER,
		displayLabel: "Cuenta",
		validate: validateBolivianAccount,
		validationErrorMessage: BOB_VALIDATION_ERROR,
	},
];

/** Country option for Bolivia (BOB). */
export const BOB_COUNTRY_OPTION: CountryOption = {
	country: "Bolivia",
	currency: CURRENCY.BOB,
	internationalFormat: "BOB",
	symbolNative: "Bs.",
	locale: "es-BO",
	paymentMethod: "QR_SIMPLE",
	paymentAddressName: "QR_SIMPLE_DETAILS",
	timezone: "America/La_Paz",
	timezone_name: "BOT",
	flag: "🇧🇴",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1e7-1f1f4.png",
	phoneCode: "+591",
	telegramSupportChannel: "https://t.me/p2pmebolivia",
	twitterUsername: "p2pmebolivia",
	smsCountryCodes: ["BO"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: [],
};
