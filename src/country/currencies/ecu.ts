// ── Placeholders & error messages ────────────────────────────────────────────

export const ECU_PLACEHOLDER_BANK = "Banco Pichincha";
export const ECU_PLACEHOLDER_ACCOUNT_TYPE = "Savings / Checking";
export const ECU_PLACEHOLDER_ACCOUNT_NUMBER = "2100123456";
export const ECU_PLACEHOLDER_NAME = "Juan Pérez";
export const ECU_PLACEHOLDER_CEDULA = "1710034065";

export const ECU_BANK_VALIDATION_ERROR = "Please enter the bank name";
export const ECU_ACCOUNT_TYPE_VALIDATION_ERROR = "Please enter the account type";
export const ECU_ACCOUNT_NUMBER_VALIDATION_ERROR =
	"Please enter a valid account number (4-20 digits)";
export const ECU_NAME_VALIDATION_ERROR = "Please enter the account holder name";
export const ECU_CEDULA_VALIDATION_ERROR = "Please enter a valid Ecuadorian cédula or RUC";

// ── Validators ───────────────────────────────────────────────────────────────

function isValidCedulaCore(cedula: string): boolean {
	if (!/^\d{10}$/.test(cedula)) return false;
	const province = Number(cedula.slice(0, 2));
	if (province < 1 || province > 24) return false;
	if (Number(cedula[2]) >= 6) return false;

	const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		let product = Number(cedula[i]) * coefficients[i];
		if (product > 9) product -= 9;
		sum += product;
	}
	const checkDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10);
	return checkDigit === Number(cedula[9]);
}

/**
 * Validates an Ecuadorian cédula (10-digit, módulo-10 checksum) or a 13-digit RUC
 * whose first 10 digits form a valid cédula. Province must be 01–24 and the third
 * digit < 6 (natural person).
 */
export function validateEcuadorianCedula(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	const cleaned = value.trim().replace(/\D/g, "");
	if (cleaned.length === 13) return isValidCedulaCore(cleaned.slice(0, 10));
	if (cleaned.length !== 10) return false;
	return isValidCedulaCore(cleaned);
}

/** Validates an Ecuadorian bank account number — 4–20 digits after stripping separators. */
export function validateEcuadorianAccountNumber(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	const cleaned = value.trim().replace(/\D/g, "");
	return /^\d{4,20}$/.test(cleaned);
}

/** Validates an account holder name — non-empty, letters/spaces/apostrophe/period/hyphen only. */
export function validateEcuadorianAccountName(value: string): boolean {
	if (!value || value.trim().length === 0) return false;
	return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]{1,}$/.test(value.trim());
}
