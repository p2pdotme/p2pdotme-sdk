export {
	validateArgentinePaymentId,
	validateColombianPaymentId,
	validateIndonesianPhoneNumber,
	validateMexicanPaymentId,
	validateNigerianAccountNumber,
	validatePIXId,
	validateRevolutId,
	validateUPIId,
	validateVenezuelanPhoneNumber,
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
 * Fields without a label are shown as-is, fields with a label are shown as "Label: value".
 */
export function formatCompoundPaymentIdForDisplay(
	paymentId: string,
	labels: (string | null)[],
): string {
	const parts = deserializeCompoundPaymentId(paymentId);
	return parts.map((part, i) => (labels[i] ? `${labels[i]}: ${part}` : part)).join(" | ");
}
