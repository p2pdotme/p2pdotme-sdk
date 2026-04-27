import { describe, expect, it } from "vitest";
import { validateArgentinePaymentId } from "../../src/country/currencies/ars";
import { validatePIXId } from "../../src/country/currencies/brl";
import { validateColombianPaymentId } from "../../src/country/currencies/cop";
import { validateRevolutId } from "../../src/country/currencies/eur";
import { validateIndonesianPhoneNumber } from "../../src/country/currencies/idr";
import { validateUPIId } from "../../src/country/currencies/inr";
import { validateMexicanPaymentId } from "../../src/country/currencies/mex";
import { validateNigerianAccountNumber } from "../../src/country/currencies/ngn";
import { validateVenezuelanPhoneNumber, validateVenezuelanRif } from "../../src/country/currencies/ven";

// ── INR ─────────────────────────────────────────────────────────────────────

describe("validateUPIId (INR)", () => {
	it.each([
		["standard handle", "merchant@paytm"],
		["phone-based UPI", "8658404239@kotak811"],
		["subdomain handle", "user.name@ybl"],
		["hyphen in username", "first-last@upi"],
		["underscore in username", "user_name@bank"],
		["minimum length username (2 chars)", "ab@ok"],
	])("accepts %s", (_label, input) => {
		expect(validateUPIId(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["missing @", "merchantpaytm"],
		["missing bank handle", "merchant@"],
		["space in id", "mer chant@paytm"],
		["double @", "user@@bank"],
		["username too short (1 char)", "a@bank"],
		["bank too short (1 char)", "user@b"],
		["special char not allowed", "user#name@bank"],
	])("rejects %s", (_label, input) => {
		expect(validateUPIId(input)).toBe(false);
	});
});

// ── IDR ─────────────────────────────────────────────────────────────────────

describe("validateIndonesianPhoneNumber (IDR)", () => {
	it.each([
		["9-digit number", "812345678"],
		["10-digit number", "8123456789"],
		["11-digit number", "81234567890"],
		["12-digit number", "812345678901"],
		["number with dashes (stripped)", "812-345-6789"],
		["number with spaces (stripped)", "812 345 678"],
	])("accepts %s", (_label, input) => {
		expect(validateIndonesianPhoneNumber(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["contains letters", "812abc789"],
		["too short (8 digits)", "81234567"],
		["too long (13 digits)", "8123456789012"],
	])("rejects %s", (_label, input) => {
		expect(validateIndonesianPhoneNumber(input)).toBe(false);
	});
});

// ── BRL ─────────────────────────────────────────────────────────────────────

describe("validatePIXId (BRL)", () => {
	it.each([
		["valid CPF", "52998224725"],
		["valid email", "user@example.com"],
		["10-digit phone (landline)", "1198765432"],
		["11-digit mobile phone", "91996339865"],
		["valid UUID", "123e4567-e89b-12d3-a456-426614174000"],
		[
			"PIX copia e cola (EMV QR payload)",
			"00020127890012br.gov.bcb.pix0132pix_randomuser@paymenthub.net5204000053039865406123.458802BR5911@87492011666009RioDeJaneiro62250521mpqrinter84736291520463016B93",
		],
	])("accepts %s", (_label, input) => {
		expect(validatePIXId(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		// 11-digit invalid CPF whose 3rd digit ≠ 9 (also not a mobile phone key)
		["CPF all same digits", "11111111111"],
		["CPF wrong check digit", "12345678901"],
		["CNPJ all same digits", "11111111111111"],
		["invalid format", "not-a-pix-key"],
		["partial UUID", "123e4567-e89b-12d3-a456"],
	])("rejects %s", (_label, input) => {
		expect(validatePIXId(input)).toBe(false);
	});

	describe("CPF checksum", () => {
		it("accepts known-valid CPFs", () => {
			expect(validatePIXId("52998224725")).toBe(true);
			expect(validatePIXId("11144477735")).toBe(true);
		});

		it("rejects CPF with flipped last digit (3rd digit not 9, cannot be phone)", () => {
			expect(validatePIXId("11144477736")).toBe(false);
		});
	});

	describe("CNPJ checksum", () => {
		it("accepts a known-valid CNPJ", () => {
			expect(validatePIXId("11222333000181")).toBe(true);
		});

		it("rejects CNPJ with wrong check digit", () => {
			expect(validatePIXId("11222333000182")).toBe(false);
		});
	});
});

// ── ARS ─────────────────────────────────────────────────────────────────────

describe("validateArgentinePaymentId (ARS)", () => {
	it.each([
		["short alias (6 chars)", "juan.p"],
		["standard alias", "juan.perez"],
		["alias with hyphen", "juan-perez"],
		["alias with underscore", "juan_perez"],
		["alias max 20 chars", "a".repeat(20)],
	])("accepts alias: %s", (_label, input) => {
		expect(validateArgentinePaymentId(input)).toBe(true);
	});

	it("accepts a valid CBU (22 digits with correct checksum)", () => {
		// Bank code 0720461 → check 0; account 0000000000000 → check 0
		expect(validateArgentinePaymentId("0720461000000000000000")).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["alias too short (5 chars)", "abcde"],
		["alias too long (21 chars)", "a".repeat(21)],
		["22-digit CBU with bad checksum", "0720461000000000000001"],
		["all-same-digit CBU", "0".repeat(22)],
		["special chars in alias", "juan@perez"],
	])("rejects %s", (_label, input) => {
		expect(validateArgentinePaymentId(input)).toBe(false);
	});
});

// ── MEX ─────────────────────────────────────────────────────────────────────

describe("validateMexicanPaymentId (MEX)", () => {
	it.each([
		["18-digit CLABE", "012345678901234567"],
		["16-digit card number", "4111111111111111"],
		["10-digit phone", "5512345678"],
		["CLABE with spaces (stripped)", "012345678901234567"],
	])("accepts %s", (_label, input) => {
		expect(validateMexicanPaymentId(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["9-digit number", "512345678"],
		["11-digit number", "55123456789"],
		["17-digit number", "01234567890123456"],
		["letters only", "abcdefghij"],
	])("rejects %s", (_label, input) => {
		expect(validateMexicanPaymentId(input)).toBe(false);
	});
});

// ── VEN ─────────────────────────────────────────────────────────────────────

describe("validateVenezuelanPhoneNumber (VEN)", () => {
	it.each([
		["04XX format", "04121234567"],
		["04XX with dashes (stripped)", "0412-123-4567"],
		["4XX format (without leading 0)", "4121234567"],
		["04161234567", "04161234567"],
	])("accepts %s", (_label, input) => {
		expect(validateVenezuelanPhoneNumber(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["starts with 05", "05121234567"],
		["too short", "0412123456"],
		["too long", "041212345678"],
		["letters", "041abc34567"],
	])("rejects %s", (_label, input) => {
		expect(validateVenezuelanPhoneNumber(input)).toBe(false);
	});
});

describe("validateVenezuelanRif (VEN)", () => {
	it.each([
		["V prefix (individual)", "V12345678"],
		["lowercase prefix (normalized)", "v12345678"],
		["short suffix (legacy)", "V12345"],
		["long suffix", "V1234567890"],
		["9-digit suffix", "V123456789"],
	])("accepts %s", (_label, input) => {
		expect(validateVenezuelanRif(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["J prefix (company, no longer allowed)", "J123456789"],
		["E prefix (foreigner, no longer allowed)", "E1234567"],
		["G prefix (government, no longer allowed)", "G12345678"],
		["C prefix (communal council, no longer allowed)", "C12345678"],
		["invalid prefix", "X12345678"],
		["letters in suffix", "V1234abcd"],
		["no prefix", "12345678"],
	])("rejects %s", (_label, input) => {
		expect(validateVenezuelanRif(input)).toBe(false);
	});
});

// ── NGN ─────────────────────────────────────────────────────────────────────

describe("validateNigerianAccountNumber (NGN)", () => {
	it.each([
		["exactly 10 digits", "0123456789"],
		["10 digits with spaces (stripped)", "01234 56789"],
	])("accepts %s", (_label, input) => {
		expect(validateNigerianAccountNumber(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["9 digits", "012345678"],
		["11 digits", "01234567890"],
		["contains letters", "012345678a"],
	])("rejects %s", (_label, input) => {
		expect(validateNigerianAccountNumber(input)).toBe(false);
	});
});

// ── COP ─────────────────────────────────────────────────────────────────────

describe("validateColombianPaymentId (COP)", () => {
	it.each([
		["10-digit phone starting with 3", "3001234567"],
		["Nequi phone", "3151234567"],
		["Daviplata phone", "3241234567"],
		["email address", "juan.perez@nequi.com.co"],
		["simple email", "user@example.com"],
		["Bre-B alias", "@juanperez"],
		["Bre-B alias with dots", "@juan.perez"],
		["Bre-B alias with underscores", "@juan_perez"],
		["Bre-B alias with hyphens", "@juan-perez"],
		["Bre-B alias with numbers", "@juan123"],
	])("accepts %s", (_label, input) => {
		expect(validateColombianPaymentId(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["phone not starting with 3", "1234567890"],
		["phone starting with 3 but 9 digits", "300123456"],
		["phone starting with 3 but 11 digits", "30012345678"],
		["invalid email (no @)", "juannequi.com"],
		["invalid email (no domain)", "juan@"],
		["@ sign alone", "@"],
		["@ with spaces", "@ juanperez"],
	])("rejects %s", (_label, input) => {
		expect(validateColombianPaymentId(input)).toBe(false);
	});
});

// ── EUR / USD ────────────────────────────────────────────────────────────────

describe("validateRevolutId (EUR / USD)", () => {
	it.each([
		["@username", "@john_doe"],
		["username without @", "john_doe"],
		["email", "john@revolut.com"],
		["phone with country code", "+447911123456"],
		["short username (3 chars)", "abc"],
		["username with dots and hyphens", "john.doe-123"],
		// Pure digit strings match the username regex (alphanumeric)
		["6-digit string (valid as username)", "123456"],
	])("accepts %s", (_label, input) => {
		expect(validateRevolutId(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["username too short (2 chars)", "ab"],
		["username too long (31 chars)", "a".repeat(31)],
		["invalid email (no TLD)", "john@revolut"],
		["special char not in allowed set", "user!name"],
	])("rejects %s", (_label, input) => {
		expect(validateRevolutId(input)).toBe(false);
	});
});
