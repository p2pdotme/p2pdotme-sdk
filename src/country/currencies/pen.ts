import { CURRENCY } from "../currency";
import { isPeruvianPayQr, payQrCandidate, validatePeruvianQr } from "../qr-validator";
import { type CountryOption, PACKED_PAYMENT_ID_SEP, type PaymentIdFieldConfig } from "../types";

export { validatePeruvianQr };

export const PEN_PLACEHOLDER = "CCI (20 digits) or Yape/Plin phone (9XXXXXXXX)";
export const PEN_PHONE_PLACEHOLDER = "PERU_PHONE_PLACEHOLDER";
export const PEN_CCI_PLACEHOLDER = "PERU_CCI_PLACEHOLDER";
export const PEN_VALIDATION_ERROR = "Please enter a valid 20-digit CCI or Yape/Plin phone number";
export const PEN_PHONE_VALIDATION_ERROR = "Please enter a valid Yape/Plin phone (9XXXXXXXX)";
export const PEN_CCI_VALIDATION_ERROR = "Please enter a valid 20-digit CCI";

/** Validates a 20-digit Peruvian CCI (spaces ignored). */
export function validatePeruvianCci(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	return /^\d{20}$/.test(value.trim().replace(/\s+/g, ""));
}

/**
 * Validates a Yape/Plin phone: `9` + 8 digits, optional `+51` / `51` prefix.
 */
export function validatePeruvianPhone(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	const phone = value
		.trim()
		.replace(/\s+/g, "")
		.replace(/^\+?51/, "");
	return /^9\d{8}$/.test(phone);
}

/**
 * Validates a Peruvian payment key for the legacy single-field path.
 * Accepts either a 20-digit CCI or a Yape/Plin phone number.
 */
export function validatePeruvianPaymentKey(value: string): boolean {
	return validatePeruvianCci(value) || validatePeruvianPhone(value);
}

/** Normalizes a CCI or Yape/Plin phone to the stored digit form. */
export function normalizePeruvianPaymentKey(value: string): string {
	const trimmed = value.trim();
	const cci = trimmed.replace(/\s+/g, "");
	if (/^\d{20}$/.test(cci)) return cci;
	const phone = trimmed.replace(/\s+/g, "").replace(/^\+?51/, "");
	if (/^9\d{8}$/.test(phone)) return phone;
	return cci;
}

export type PeruvianPaymentIdParts = {
	qr: string | null;
	phone: string | null;
	cci: string | null;
};

function looksLikeTlv(value: string): boolean {
	if (value.length < 5 || !/^\d{4}/.test(value)) return false;
	const len = Number.parseInt(value.slice(2, 4), 10);
	return !Number.isNaN(len) && len >= 0 && 4 + len <= value.length;
}

/**
 * Phone from a TLV value. Skips hex hashes (Yape tag 39) so `998765432`
 * inside a checksum never counts. Allows `+51` / `51` glued to a 9XXXXXXXX.
 */
function phoneFromTlvValue(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (validatePeruvianPhone(trimmed)) return normalizePeruvianPaymentKey(trimmed);
	if (/^[0-9a-f]+$/i.test(trimmed) && /[a-f]/i.test(trimmed)) return null;
	const match = trimmed.match(/(^|[^0-9])(\+?51)?(9\d{8})(?![0-9])/);
	if (!match) return null;
	const candidate = `${match[2] ?? ""}${match[3]}`;
	return validatePeruvianPhone(candidate) ? normalizePeruvianPaymentKey(candidate) : null;
}

/**
 * Walks EMVCo TLV (merchant-account templates, additional data, and any nested
 * TLV) and returns the first Yape/Plin phone found.
 */
function extractPeruvianPhoneFromQr(payload: string): string | null {
	let pos = 0;
	while (pos + 4 <= payload.length) {
		const tag = payload.slice(pos, pos + 2);
		const len = Number.parseInt(payload.slice(pos + 2, pos + 4), 10);
		if (Number.isNaN(len) || len < 0 || pos + 4 + len > payload.length) break;
		const value = payload.slice(pos + 4, pos + 4 + len);
		const direct = phoneFromTlvValue(value);
		if (direct) return direct;
		if ((tag >= "02" && tag <= "51") || tag === "62" || tag === "64" || looksLikeTlv(value)) {
			const nested = extractPeruvianPhoneFromQr(value);
			if (nested) return nested;
		}
		pos += 4 + len;
	}
	const glued = payload.match(/\+51\s*9\d{8}/);
	if (glued && validatePeruvianPhone(glued[0])) {
		return normalizePeruvianPaymentKey(glued[0]);
	}
	return null;
}

function parsePeruvianFallback(value: string): Pick<PeruvianPaymentIdParts, "phone" | "cci"> {
	const trimmed = value.trim();
	if (!trimmed) return { phone: null, cci: null };
	const tokens = trimmed
		.split("|")
		.map((token) => token.trim())
		.filter(Boolean);
	let phone: string | null = null;
	let cci: string | null = null;
	for (const token of tokens) {
		if (!phone && validatePeruvianPhone(token)) {
			phone = normalizePeruvianPaymentKey(token);
			continue;
		}
		if (!cci && validatePeruvianCci(token)) {
			cci = normalizePeruvianPaymentKey(token);
		}
	}
	return { phone, cci };
}

/**
 * Splits a stored PEN payment ID into QR payload and/or typed fallback.
 * Formats: EMVCo blob, CCI, phone, `phone|cci`, or `blob||fallback`.
 */
export function parsePeruvianPaymentId(value: string | null | undefined): PeruvianPaymentIdParts {
	if (!value || typeof value !== "string") {
		return { qr: null, phone: null, cci: null };
	}
	const trimmed = value.trim();
	const sep = trimmed.indexOf(PACKED_PAYMENT_ID_SEP);
	if (sep >= 0) {
		const left = trimmed.slice(0, sep);
		const right = trimmed.slice(sep + PACKED_PAYMENT_ID_SEP.length);
		const fallback = parsePeruvianFallback(right);
		const qr = validatePeruvianQr(left) ? left : null;
		return {
			qr,
			phone: fallback.phone ?? (qr ? extractPeruvianPhoneFromQr(qr) : null),
			cci: fallback.cci,
		};
	}
	if (validatePeruvianQr(trimmed)) {
		return {
			qr: trimmed,
			phone: extractPeruvianPhoneFromQr(trimmed),
			cci: null,
		};
	}
	const fallback = parsePeruvianFallback(trimmed);
	return { qr: null, phone: fallback.phone, cci: fallback.cci };
}

export function serializePeruvianPaymentId(
	qr: string | null | undefined,
	phone: string | null | undefined,
	cci: string | null | undefined,
): string {
	const q = qr?.trim() && validatePeruvianQr(qr.trim()) ? qr.trim() : "";
	const p = phone?.trim() && validatePeruvianPhone(phone) ? normalizePeruvianPaymentKey(phone) : "";
	const c = cci?.trim() && validatePeruvianCci(cci) ? normalizePeruvianPaymentKey(cci) : "";
	const fallback = p && c ? `${p}|${c}` : p || c;
	if (q && fallback) return `${q}${PACKED_PAYMENT_ID_SEP}${fallback}`;
	return q || fallback;
}

function isValidPeruvianTypedRest(value: string): boolean {
	const nonempty = value
		.split("|")
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
	if (nonempty.length === 0) return false;
	return nonempty.every((token) => validatePeruvianPhone(token) || validatePeruvianCci(token));
}

/** QR payload and/or CCI and/or Yape/Plin phone. A packed rest must be valid typed fields. */
export function validatePeruvianPaymentId(value: string): boolean {
	if (!value || typeof value !== "string") return false;
	const trimmed = value.trim();
	const sep = trimmed.indexOf(PACKED_PAYMENT_ID_SEP);
	if (sep >= 0) {
		const left = trimmed.slice(0, sep);
		const right = trimmed.slice(sep + PACKED_PAYMENT_ID_SEP.length);
		const qrOk = validatePeruvianQr(left);
		if (right.trim()) return qrOk && isValidPeruvianTypedRest(right);
		return qrOk;
	}
	if (validatePeruvianQr(trimmed)) return true;
	return isValidPeruvianTypedRest(trimmed);
}

/** Payment ID field configuration for PEN (Peru). At least one of phone / CCI. */
export const PEN_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PERU_PHONE_LABEL",
		placeholder: PEN_PHONE_PLACEHOLDER,
		displayLabel: "Yape / Plin phone",
		validate: validatePeruvianPhone,
		validationErrorMessage: PEN_PHONE_VALIDATION_ERROR,
		optional: true,
	},
	{
		key: "cci",
		label: "PERU_CCI_LABEL",
		placeholder: PEN_CCI_PLACEHOLDER,
		displayLabel: "CCI",
		validate: validatePeruvianCci,
		validationErrorMessage: PEN_CCI_VALIDATION_ERROR,
		optional: true,
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
	uploadPaymentQR: true,
	validateQr: validatePeruvianQr,
	getPayQrPayload: (paymentId) => {
		const candidate = payQrCandidate(paymentId);
		return isPeruvianPayQr(candidate) ? candidate : null;
	},
	hydrateFieldsFromQr: (qr) => {
		const phone = extractPeruvianPhoneFromQr(qr);
		return phone ? { phone } : {};
	},
};
