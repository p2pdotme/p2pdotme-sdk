import { CURRENCY } from "../currency";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const VEN_PLACEHOLDER = "04121234567";
export const VEN_PLACEHOLDER_RIF = "V12345678";
export const VEN_PLACEHOLDER_BANK = "Banesco";

export const VEN_VALIDATION_ERROR = "Please enter a valid phone number (e.g., 04121234567)";
export const VEN_VALIDATION_ERROR_RIF =
	"Please enter a valid Cédula/RIF (e.g., V12345678, P12345678)";
export const VEN_VALIDATION_ERROR_BANK = "Please enter a bank name";

/** Allowed Venezuelan document prefixes for Pago Móvil (SENIAT / banking). */
export const VEN_RIF_PREFIXES = ["V", "E", "J", "G", "R", "P"] as const;

/**
 * Validates Venezuelan phone number for Pago Movil.
 * Format: 04XX-XXXXXXX (11 digits starting with 04).
 */
export function validateVenezuelanPhoneNumber(phoneNumber: string): boolean {
	if (!phoneNumber || phoneNumber.trim().length === 0) return false;

	const cleaned = phoneNumber.trim().replace(/\D/g, "");

	if (/^04\d{9}$/.test(cleaned)) return true;
	if (/^4\d{9}$/.test(cleaned)) return true;

	return false;
}

/**
 * Validates Venezuelan Cédula/RIF for Pago Móvil.
 * Format: prefix (V|E|J|G|R|P) followed by digits.
 * Includes natural persons (V), foreigners (E), companies (J), government (G),
 * residual (R), and passport-linked accounts (P).
 */
export function validateVenezuelanRif(rif: string): boolean {
	if (!rif || rif.trim().length === 0) return false;
	const trimmed = rif.trim().toUpperCase();
	return /^[VEJGRP]\d+$/.test(trimmed);
}

/**
 * Structural check for a Suiche 7B (Pago Móvil) QR payload.
 * Live bank QRs are `base64?merchantId=NNNN&…` — the blob is opaque AES; we
 * only validate the envelope so the payload can be stored and re-rendered.
 */
/** Joins an optional S7B QR payload with `phone|rif|bank` in one stored ID. */
export const VEN_QR_COMPOUND_SEP = "||";

export function validateVenezuelanQr(payload: string): boolean {
	if (!payload || typeof payload !== "string") return false;
	const trimmed = payload.trim();
	if (trimmed.includes(VEN_QR_COMPOUND_SEP)) return false;
	const qIdx = trimmed.indexOf("?");
	if (qIdx < 40) return false;
	const blob = trimmed.substring(0, qIdx);
	if (!/^[A-Za-z0-9+/=]+$/.test(blob)) return false;
	return /(?:^|[?&])merchantId=\d{3,4}(?:&|$)/.test(trimmed.substring(qIdx));
}

function isValidVenezuelanCompound(value: string): boolean {
	const parts = value.split("|");
	if (parts.length !== 3) return false;
	return (
		validateVenezuelanPhoneNumber(parts[0]) &&
		validateVenezuelanRif(parts[1]) &&
		parts[2].trim().length > 0
	);
}

export type VenezuelanPaymentIdParts = {
	qr: string | null;
	compound: string | null;
};

/**
 * Splits a stored VEN payment ID into its QR payload and/or typed fallback.
 * Formats: S7B blob, `phone|rif|bank`, or `blob||phone|rif|bank`.
 */
export function parseVenezuelanPaymentId(
	value: string | null | undefined,
): VenezuelanPaymentIdParts {
	if (!value || typeof value !== "string") return { qr: null, compound: null };
	const trimmed = value.trim();
	const sep = trimmed.indexOf(VEN_QR_COMPOUND_SEP);
	if (sep >= 0) {
		const left = trimmed.slice(0, sep);
		const right = trimmed.slice(sep + VEN_QR_COMPOUND_SEP.length);
		return {
			qr: validateVenezuelanQr(left) ? left : null,
			compound: isValidVenezuelanCompound(right) ? right : null,
		};
	}
	if (validateVenezuelanQr(trimmed)) return { qr: trimmed, compound: null };
	if (isValidVenezuelanCompound(trimmed)) return { qr: null, compound: trimmed };
	return { qr: null, compound: null };
}

export function serializeVenezuelanPaymentId(
	qr: string | null | undefined,
	compound: string | null | undefined,
): string {
	const q = qr?.trim() && validateVenezuelanQr(qr.trim()) ? qr.trim() : "";
	const c = compound?.trim() || "";
	if (q && c) return `${q}${VEN_QR_COMPOUND_SEP}${c}`;
	return q || c;
}

/**
 * Accepts a Suiche 7B QR payload, the typed `phone|rif|bank` fallback,
 * or both packed as `qr||phone|rif|bank`.
 */
export function validateVenezuelanPaymentId(value: string): boolean {
	if (!value || typeof value !== "string") return false;
	const { qr, compound } = parseVenezuelanPaymentId(value);
	return qr !== null || compound !== null;
}

/** Payment ID field configuration for VEN (Venezuela, Pago Móvil). */
export const VEN_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "phone",
		label: "PHONE_NUMBER",
		placeholder: VEN_PLACEHOLDER,
		displayLabel: "Phone",
		validate: validateVenezuelanPhoneNumber,
		validationErrorMessage: VEN_VALIDATION_ERROR,
	},
	{
		key: "rif",
		label: "RIF_LABEL",
		placeholder: VEN_PLACEHOLDER_RIF,
		displayLabel: "Cédula/RIF",
		validate: validateVenezuelanRif,
		validationErrorMessage: VEN_VALIDATION_ERROR_RIF,
	},
	{
		key: "bank",
		label: "BANK_LABEL",
		placeholder: VEN_PLACEHOLDER_BANK,
		displayLabel: "Banco",
		validate: (v: string) => v.trim().length > 0,
		validationErrorMessage: VEN_VALIDATION_ERROR_BANK,
	},
];

/** Country option for Venezuela (VEN). */
export const VEN_COUNTRY_OPTION: CountryOption = {
	country: "Venezuela",
	currency: CURRENCY.VEN,
	internationalFormat: "VES",
	symbolNative: "Bs",
	locale: "es-VE",
	paymentMethod: "PAGO_MOVIL",
	paymentAddressName: "PAGO_MOVIL_DETAILS",
	timezone: "America/Caracas",
	timezone_name: "VET",
	flag: "🇻🇪",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1fb-1f1ea.png",
	phoneCode: "+58",
	telegramSupportChannel: "https://t.me/p2pmevenezuela",
	twitterUsername: "p2pmevenezuela",
	smsCountryCodes: ["VE"],
	precision: 2,
	isAlpha: false,
	disabled: false,
	disabledPaymentTypes: [],
	uploadPaymentQR: false,
	packedPaymentId: true,
	validateQr: validateVenezuelanQr,
};
