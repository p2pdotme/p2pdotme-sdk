import { COUNTRY_OPTIONS } from "./countries";
import { parsePeruvianPaymentId, validatePeruvianPaymentId } from "./currencies/pen";
import type { CurrencyCode } from "./currency";
import { PAYMENT_ID_FIELDS } from "./payment-fields";
import type { PaymentIdFieldConfig } from "./types";

export {
	PEN_QR_COMPOUND_SEP,
	parsePeruvianPaymentId,
	parseVenezuelanPaymentId,
	serializePeruvianPaymentId,
	serializeVenezuelanPaymentId,
	validateArgentinePaymentId,
	validateColombianPaymentId,
	validateCubanCardNumber,
	validateCubanPhoneNumber,
	validateEcuadorianAccountName,
	validateEcuadorianAccountNumber,
	validateEcuadorianCedula,
	validateIndonesianPhoneNumber,
	validateMexicanPaymentId,
	validateNigerianAccountName,
	validateNigerianAccountNumber,
	validatePeruvianCci,
	validatePeruvianPaymentId,
	validatePeruvianPaymentKey,
	validatePeruvianPhone,
	validatePeruvianQr,
	validatePhilippinePhoneNumber,
	validatePIXId,
	validateRevolutId,
	validateUPIId,
	validateVenezuelanPaymentId,
	validateVenezuelanPhoneNumber,
	validateVenezuelanQr,
	validateVenezuelanRif,
} from "./currencies";

/** Serializes multiple fields into a pipe-separated string. */
export function serializeCompoundPaymentId(...fields: string[]): string {
	return fields.join("|");
}

/** Deserializes a pipe-separated payment ID into its component fields. */
export function deserializeCompoundPaymentId(paymentId: string): string[] {
	return paymentId.split("|");
}

/**
 * Formats a compound payment ID for display using optional labels.
 * Empty parts (optional fields left blank) are omitted.
 */
export function formatCompoundPaymentIdForDisplay(
	paymentId: string,
	labels: (string | null)[],
): string {
	const parts = deserializeCompoundPaymentId(paymentId);
	return parts
		.map((part, i) => {
			if (!part?.trim()) return null;
			return labels[i] ? `${labels[i]}: ${part}` : part;
		})
		.filter((part): part is string => part !== null)
		.join(" | ");
}

/**
 * Validates a stored payment ID against `PAYMENT_ID_FIELDS`.
 * Optional fields may be empty; if every field is optional, at least one must
 * be filled. A legacy single token (no `|`) matches any one field's validator.
 */
export function validatePaymentIdFields(
	fields: readonly PaymentIdFieldConfig[],
	paymentId: string,
): boolean {
	if (!paymentId || paymentId.trim().length === 0) return false;
	if (!fields.length) return false;

	if (fields.length === 1) {
		return fields[0].validate(paymentId);
	}

	const parts = deserializeCompoundPaymentId(paymentId);

	if (parts.length === 1) {
		if (!fields.some((field) => field.optional)) return false;
		return fields.some((field) => field.validate(parts[0]));
	}

	const values = fields.map((_, i) => (parts[i] ?? "").trim());
	const eachOk = fields.every((field, i) => {
		const value = values[i];
		if (!value) return field.optional === true;
		return field.validate(value);
	});
	if (!eachOk) return false;

	return values.some((value) => value.length > 0);
}

/**
 * Splits a stored payment ID into per-field values for form hydration.
 * A legacy single token is assigned to the first field whose validator matches.
 */
export function assignPaymentIdToFieldValues(
	fields: readonly PaymentIdFieldConfig[],
	paymentId: string,
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const field of fields) result[field.key] = "";
	if (!paymentId) return result;

	const { rest } = unpackPackedPaymentId(paymentId);
	if (!rest) return result;

	const tokens = deserializeCompoundPaymentId(rest)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	const claimed = new Set<string>();
	for (const token of tokens) {
		const field = fields.find((item) => !claimed.has(item.key) && item.validate(token));
		if (field) {
			result[field.key] = token;
			claimed.add(field.key);
		}
	}

	if (claimed.size === 0 && tokens.length === 1 && fields.length === 1) {
		result[fields[0].key] = tokens[0];
		return result;
	}

	if (claimed.size < Math.min(tokens.length, fields.length)) {
		fields.forEach((field, i) => {
			if (!result[field.key]) result[field.key] = tokens[i] ?? "";
		});
	}

	return result;
}

/** Pack separator for optional QR + typed fields (`qr||phone|cci`). */
export const PACKED_PAYMENT_ID_SEP = "||";

export function unpackPackedPaymentId(paymentId: string): {
	qr: string;
	rest: string;
} {
	const sep = paymentId.indexOf(PACKED_PAYMENT_ID_SEP);
	if (sep < 0) return { qr: "", rest: paymentId };
	return {
		qr: paymentId.slice(0, sep),
		rest: paymentId.slice(sep + PACKED_PAYMENT_ID_SEP.length),
	};
}

function countryOption(currency: CurrencyCode | null | undefined) {
	if (!currency) return undefined;
	return COUNTRY_OPTIONS.find((c) => c.currency === currency);
}

/**
 * Validates a stored payment ID: optional packed QR, then catalog fields.
 * QR-only is valid when the country exposes `validateQr`.
 */
export function validateStoredPaymentId(currency: CurrencyCode, paymentId: string): boolean {
	if (!paymentId || paymentId.trim().length === 0) return false;
	if (currency === "PEN") return validatePeruvianPaymentId(paymentId);
	const fields = PAYMENT_ID_FIELDS[currency];
	if (!fields?.length) return false;
	const option = countryOption(currency);
	const trimmed = paymentId.trim();
	const { qr, rest } = unpackPackedPaymentId(trimmed);

	if (qr) {
		if (!option?.validateQr?.(qr)) return false;
		if (!rest.trim()) return true;
		return validatePaymentIdFields(fields, rest);
	}
	if (option?.validateQr?.(trimmed) && !trimmed.includes("|")) return true;
	return validatePaymentIdFields(fields, trimmed);
}

/**
 * Typed-field values for form hydration. Packed QR prefix is stripped.
 * PEN uses parsePeruvianPaymentId so CCI and phone both surface, including a
 * phone embedded in the Yape/Plin QR. QR-only with no typed fields stays empty.
 */
export function assignStoredPaymentIdToFieldValues(
	currency: CurrencyCode,
	paymentId: string,
): Record<string, string> {
	if (currency === "PEN") {
		const parsed = parsePeruvianPaymentId(paymentId);
		return {
			phone: parsed.phone ?? "",
			cci: parsed.cci ?? "",
		};
	}
	const fields = PAYMENT_ID_FIELDS[currency] ?? [];
	const option = countryOption(currency);
	const { rest } = unpackPackedPaymentId(paymentId);
	const source = rest.trim();
	if (!source || (option?.validateQr?.(source) && !source.includes("|"))) {
		return assignPaymentIdToFieldValues(fields, "");
	}
	return assignPaymentIdToFieldValues(fields, source);
}

/**
 * Human-readable stored ID: labeled typed fields, never the raw QR blob.
 * QR-only returns an empty string so the caller can substitute a label.
 */
export function formatStoredPaymentIdForDisplay(currency: CurrencyCode, paymentId: string): string {
	const fields = PAYMENT_ID_FIELDS[currency] ?? [];
	const values = assignStoredPaymentIdToFieldValues(currency, paymentId);
	if (fields.length <= 1) return (values[fields[0]?.key ?? ""] || "").trim();
	return fields
		.map((field) => {
			const value = (values[field.key] || "").trim();
			if (!value) return null;
			return field.displayLabel ? `${field.displayLabel}: ${value}` : value;
		})
		.filter((part): part is string => part !== null)
		.join(" | ");
}
