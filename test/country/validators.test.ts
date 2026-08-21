import { describe, expect, it } from "vitest";
import { validateArgentinePaymentId } from "../../src/country/currencies/ars";
import { validateBolivianAccount, validateBolivianQr } from "../../src/country/currencies/bob";
import { validatePIXId } from "../../src/country/currencies/brl";
import { validateColombianPaymentId } from "../../src/country/currencies/cop";
import { validateCubanCardNumber, validateCubanPhoneNumber } from "../../src/country/currencies/cup";
import {
	validateEcuadorianAccountName,
	validateEcuadorianAccountNumber,
	validateEcuadorianCedula,
} from "../../src/country/currencies/ecu";
import { validateRevolutId } from "../../src/country/currencies/eur";
import { validateIndonesianPhoneNumber } from "../../src/country/currencies/idr";
import { validateUPIId } from "../../src/country/currencies/inr";
import { validateMexicanPaymentId } from "../../src/country/currencies/mex";
import { validateNigerianAccountName, validateNigerianAccountNumber } from "../../src/country/currencies/ngn";
import {
	PEN_PAYMENT_FIELDS,
	parsePeruvianPaymentId,
	serializePeruvianPaymentId,
	validatePeruvianCci,
	validatePeruvianPaymentId,
	validatePeruvianPaymentKey,
	validatePeruvianPhone,
	validatePeruvianQr,
} from "../../src/country/currencies/pen";
import { validatePhilippinePhoneNumber } from "../../src/country/currencies/php";
import { calculateCRC16 } from "../../src/qr-parsers/utils/crc16";
import {
	assignPaymentIdToFieldValues,
	assignStoredPaymentIdToFieldValues,
	formatStoredPaymentIdForDisplay,
	getStoredQrPayload,
	PACKED_PAYMENT_ID_SEP,
	packStoredPaymentId,
	validateCatalogPaymentDraft,
	validatePaymentIdFields,
	validateStoredPaymentId,
} from "../../src/country/validators";
import { usesPackedPaymentId } from "../../src/country/countries";
import {
	validateVenezuelanPaymentId,
	validateVenezuelanPhoneNumber,
	validateVenezuelanQr,
	validateVenezuelanRif,
} from "../../src/country/currencies/ven";

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
		["E prefix (foreigner)", "E1234567"],
		["J prefix (company)", "J123456789"],
		["G prefix (government)", "G12345678"],
		["R prefix (residual)", "R12345678"],
		["P prefix (passport)", "P12345678"],
		["lowercase prefix (normalized)", "v12345678"],
		["lowercase P prefix", "p12345678"],
		["short suffix (legacy)", "V12345"],
		["long suffix", "V1234567890"],
		["9-digit suffix", "V123456789"],
	])("accepts %s", (_label, input) => {
		expect(validateVenezuelanRif(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["C prefix (communal council, not allowed)", "C12345678"],
		["invalid prefix", "X12345678"],
		["letters in suffix", "V1234abcd"],
		["no prefix", "12345678"],
		["prefix only", "P"],
	])("rejects %s", (_label, input) => {
		expect(validateVenezuelanRif(input)).toBe(false);
	});
});

describe("validateVenezuelanQr (VEN S7B)", () => {
	const tesoro =
		"dBKxwilNo3+ATaUX7YpeGfb+DOGtIBnj2DpAypb7U6gqar/JxjhLFaXIKyv9O+Z6xh3rX2B6huFupypAZjcj0istG7bYvJ5XO3NfqXYAeVR+hEwkuuBBcCy+9MKH7OJMvDGEXU143a7+bgcrTjaCzQ==?merchantId=0163&strong_id=1786921164-3";
	const mercantil =
		"m28tuwbizhMer7LqTrXDR390LJYTLTMLxvAojSnPrZ2ese+vGGypN/1IfjBJVQyduC5qN+Hvyqa8FzYoP1xntmkI7PU6HlnAEpYgEZ1TSahnec0Ctt1Tpg3gK3rTG0ay5ST8h24YHsc6Q4aZtmxdLjtKyeChlbRhqq6v8e9qNlrpc/2nZ6HV0a1mcIOz7qm4GgpPQMaHW5ywzkuWE0ps9fMB9kCiyGPNj6G0SZomROybsNlMDevCMdpbGyz5w84MxNdomJwEgy8qhBYgKSEPlCn/cCmAdeZCtyFypu6Tr1tDgrlL0kLNRrv2CQKkLw3uHx8zxZohwuu3Cau0io4elA==?merchantId=0105&strong_id=260722171116&origin=web";

	it.each([
		["Tesoro live QR", tesoro],
		["Mercantil live QR with origin=web", mercantil],
	])("accepts %s", (_label, input) => {
		expect(validateVenezuelanQr(input)).toBe(true);
	});

	it.each([
		["empty", ""],
		["no query", "dGVzdA=="],
		["short blob", "SGVsbG8=?merchantId=0134"],
		["missing merchantId", `${"A".repeat(48)}?origin=web`],
		["compound payment id", "04121234567|V12345678|Banesco"],
	])("rejects %s", (_label, input) => {
		expect(validateVenezuelanQr(input)).toBe(false);
	});
});

describe("validateVenezuelanPaymentId (VEN QR or compound)", () => {
	it("accepts a Suiche 7B payload", () => {
		expect(
			validateVenezuelanPaymentId(
				`${"A".repeat(48)}?merchantId=0134&origin=app`,
			),
		).toBe(true);
	});

	it("accepts a legacy phone|rif|bank id", () => {
		expect(validateVenezuelanPaymentId("04121234567|V12345678|Banesco")).toBe(
			true,
		);
	});

	it("rejects a phone-only value", () => {
		expect(validateVenezuelanPaymentId("04121234567")).toBe(false);
	});

	it("accepts a packed QR + phone|rif|bank id", () => {
		const qr = `${"A".repeat(48)}?merchantId=0134&origin=app`;
		expect(
			validateVenezuelanPaymentId(`${qr}||04121234567|V12345678|Banesco`),
		).toBe(true);
	});

	it("rejects a packed QR with an incomplete typed rest", () => {
		const qr = `${"A".repeat(48)}?merchantId=0134&origin=app`;
		expect(validateVenezuelanPaymentId(`${qr}||04121234567`)).toBe(false);
		expect(validateVenezuelanPaymentId(`${qr}||04121234567||`)).toBe(false);
		expect(validateVenezuelanPaymentId(`${qr}||04121234567|V12345678|`)).toBe(
			false,
		);
	});

	it("does not treat a packed id as a raw QR payload", () => {
		const qr = `${"A".repeat(48)}?merchantId=0134&origin=app`;
		expect(
			validateVenezuelanQr(`${qr}||04121234567|V12345678|Banesco`),
		).toBe(false);
	});
});

// ── CUP ───────────────────────────────────────────────────────────────────────────

describe("validateCubanPhoneNumber (CUP)", () => {
	it.each([
		["8-digit number", "54004417"],
		["number with spaces (stripped)", "5400 4417"],
		["number with dashes (stripped)", "5400-4417"],
		["number with +53 country code", "+53 54004417"],
		["number with 53 prefix", "5354004417"],
	])("accepts %s", (_label, input) => {
		expect(validateCubanPhoneNumber(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["too short (7 digits)", "5400441"],
		["too long (9 digits)", "540044171"],
		["letters", "5400441a"],
	])("rejects %s", (_label, input) => {
		expect(validateCubanPhoneNumber(input)).toBe(false);
	});
});

describe("validateCubanCardNumber (CUP)", () => {
	it.each([
		["16 digits with spaces", "9227 9598 7238 3620"],
		["16 digits without spaces", "9227959872383620"],
		["16 digits with dashes", "9227-9598-7238-3620"],
	])("accepts %s", (_label, input) => {
		expect(validateCubanCardNumber(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["too short (15 digits)", "922795987238362"],
		["too long (17 digits)", "92279598723836201"],
		["letters", "9227 9598 7238 362a"],
		["other separators", "9227/9598/7238/3620"],
	])("rejects %s", (_label, input) => {
		expect(validateCubanCardNumber(input)).toBe(false);
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

describe("validateNigerianAccountName (NGN)", () => {
	it.each([
		["single first + last", "Chinedu Okafor"],
		["three names", "Aisha Bola Adekunle"],
		["name with hyphen", "Ngozi Eze-Okeke"],
		["name with apostrophe", "O'Brien Adeyemi"],
		["name with period (initial)", "J. Okonkwo"],
		["surrounding whitespace (trimmed)", "  Tunde Bakare  "],
	])("accepts %s", (_label, input) => {
		expect(validateNigerianAccountName(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["single character", "A"],
		["leading digit", "1Chinedu"],
		["contains digits", "Chinedu1"],
		["disallowed special char", "Chinedu@Okafor"],
	])("rejects %s", (_label, input) => {
		expect(validateNigerianAccountName(input)).toBe(false);
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

// ── PEN ─────────────────────────────────────────────────────────────────────

describe("validatePeruvianPaymentKey (PEN)", () => {
	it.each([
		["20-digit CCI", "00212345678901234567"],
		["20-digit CCI with spaces (stripped)", "0021 2345 6789 0123 4567"],
		["Yape/Plin phone", "987654321"],
		["phone with +51 prefix", "+51987654321"],
		["phone with 51 prefix", "51987654321"],
		["phone with +51 and spaces", "+51 987654321"],
	])("accepts %s", (_label, input) => {
		expect(validatePeruvianPaymentKey(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["19-digit CCI (too short)", "0021234567890123456"],
		["21-digit CCI (too long)", "002123456789012345678"],
		["phone not starting with 9", "887654321"],
		["phone too short (8 digits)", "98765432"],
		["contains letters", "9876543ab"],
	])("rejects %s", (_label, input) => {
		expect(validatePeruvianPaymentKey(input)).toBe(false);
	});
});

describe("PEN_PAYMENT_FIELDS catalog", () => {
	it("has optional phone and CCI fields", () => {
		expect(PEN_PAYMENT_FIELDS.map((f) => f.key)).toEqual(["phone", "cci"]);
		expect(PEN_PAYMENT_FIELDS.every((f) => f.optional)).toBe(true);
	});

	it("validatePaymentIdFields accepts phone, CCI, or both", () => {
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "987654321")).toBe(true);
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "00212345678901234567")).toBe(true);
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "987654321|00212345678901234567")).toBe(
			true,
		);
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "|00212345678901234567")).toBe(true);
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "987654321|")).toBe(true);
	});

	it("validatePaymentIdFields rejects empty or invalid pairs", () => {
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "")).toBe(false);
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "|")).toBe(false);
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "887654321")).toBe(false);
		expect(validatePaymentIdFields(PEN_PAYMENT_FIELDS, "987654321|123")).toBe(false);
	});

	it("assignPaymentIdToFieldValues hydrates legacy single tokens", () => {
		expect(assignPaymentIdToFieldValues(PEN_PAYMENT_FIELDS, "987654321")).toEqual({
			phone: "987654321",
			cci: "",
		});
		expect(assignPaymentIdToFieldValues(PEN_PAYMENT_FIELDS, "00212345678901234567")).toEqual({
			phone: "",
			cci: "00212345678901234567",
		});
		expect(
			assignPaymentIdToFieldValues(PEN_PAYMENT_FIELDS, "987654321|00212345678901234567"),
		).toEqual({
			phone: "987654321",
			cci: "00212345678901234567",
		});
		expect(
			assignPaymentIdToFieldValues(PEN_PAYMENT_FIELDS, "00212345678901234567|987654321"),
		).toEqual({
			phone: "987654321",
			cci: "00212345678901234567",
		});
	});
});

describe("parse/serialize Peruvian packed payment ID", () => {
	const SAMPLE =
		"0002010102113932acfba6cb922753c690f09280f365d7a25204561153036045802PE5906YAPERO6004Lima6304ECE9";
	const PHONE = "987654321";
	const CCI = "00212345678901234567";

	it("round-trips phone, CCI, both, and packed QR", () => {
		expect(parsePeruvianPaymentId(PHONE)).toEqual({ qr: null, phone: PHONE, cci: null });
		expect(parsePeruvianPaymentId(CCI)).toEqual({ qr: null, phone: null, cci: CCI });
		expect(parsePeruvianPaymentId(`${PHONE}|${CCI}`)).toEqual({
			qr: null,
			phone: PHONE,
			cci: CCI,
		});
		expect(parsePeruvianPaymentId(`${CCI}|${PHONE}`)).toEqual({
			qr: null,
			phone: PHONE,
			cci: CCI,
		});
		expect(parsePeruvianPaymentId(SAMPLE)).toEqual({ qr: SAMPLE, phone: null, cci: null });
		expect(serializePeruvianPaymentId(SAMPLE, PHONE, CCI)).toBe(
			`${SAMPLE}${PACKED_PAYMENT_ID_SEP}${PHONE}|${CCI}`,
		);
		expect(parsePeruvianPaymentId(serializePeruvianPaymentId(SAMPLE, PHONE, ""))).toEqual({
			qr: SAMPLE,
			phone: PHONE,
			cci: null,
		});
	});

	it("shows CCI and also the phone when the QR embeds it", () => {
		const crc16ccitt = (s: string) => {
			let crc = 0xffff;
			for (let i = 0; i < s.length; i++) {
				crc ^= s.charCodeAt(i) << 8;
				for (let j = 0; j < 8; j++) {
					crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
					crc &= 0xffff;
				}
			}
			return crc.toString(16).toUpperCase().padStart(4, "0");
		};
		const body =
			"00020101021126210004test010998765432153036045802PE5906YAPERO6004Lima6304";
		const qr = `${body}${crc16ccitt(body)}`;
		expect(parsePeruvianPaymentId(qr)).toEqual({
			qr,
			phone: PHONE,
			cci: null,
		});
		expect(parsePeruvianPaymentId(`${qr}${PACKED_PAYMENT_ID_SEP}${CCI}`)).toEqual({
			qr,
			phone: PHONE,
			cci: CCI,
		});
		expect(formatStoredPaymentIdForDisplay("PEN", `${qr}${PACKED_PAYMENT_ID_SEP}${CCI}`)).toBe(
			`Yape / Plin phone: ${PHONE} | CCI: ${CCI}`,
		);
		expect(assignStoredPaymentIdToFieldValues("PEN", `${qr}${PACKED_PAYMENT_ID_SEP}${CCI}`)).toEqual({
			phone: PHONE,
			cci: CCI,
		});
	});

	it("extracts a Yape phone from merchant-account tag 02", () => {
		const crc16ccitt = (s: string) => {
			let crc = 0xffff;
			for (let i = 0; i < s.length; i++) {
				crc ^= s.charCodeAt(i) << 8;
				for (let j = 0; j < 8; j++) {
					crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
					crc &= 0xffff;
				}
			}
			return crc.toString(16).toUpperCase().padStart(4, "0");
		};
		const body = "0002010102110212+5198765432153036045802PE5906YAPERO6004Lima6304";
		const qr = `${body}${crc16ccitt(body)}`;
		expect(parsePeruvianPaymentId(qr)).toEqual({ qr, phone: PHONE, cci: null });
		expect(parsePeruvianPaymentId(`${qr}${PACKED_PAYMENT_ID_SEP}${CCI}`)).toEqual({
			qr,
			phone: PHONE,
			cci: CCI,
		});
		expect(formatStoredPaymentIdForDisplay("PEN", `${qr}${PACKED_PAYMENT_ID_SEP}${CCI}`)).toBe(
			`Yape / Plin phone: ${PHONE} | CCI: ${CCI}`,
		);
	});

	it("extracts a Yape phone glued with +51 inside a merchant-account value", () => {
		const crc16ccitt = (s: string) => {
			let crc = 0xffff;
			for (let i = 0; i < s.length; i++) {
				crc ^= s.charCodeAt(i) << 8;
				for (let j = 0; j < 8; j++) {
					crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
					crc &= 0xffff;
				}
			}
			return crc.toString(16).toUpperCase().padStart(4, "0");
		};
		const body =
			"0002010102112618YAPE+51987654321PE53036045802PE5906YAPERO6004Lima6304";
		const qr = `${body}${crc16ccitt(body)}`;
		expect(parsePeruvianPaymentId(qr)).toEqual({ qr, phone: PHONE, cci: null });
		expect(parsePeruvianPaymentId(`${qr}${PACKED_PAYMENT_ID_SEP}${CCI}`)).toEqual({
			qr,
			phone: PHONE,
			cci: CCI,
		});
		expect(parsePeruvianPaymentId(SAMPLE)).toEqual({ qr: SAMPLE, phone: null, cci: null });
	});

	it("validatePeruvianPaymentId accepts QR, phone, or CCI", () => {
		expect(validatePeruvianPaymentId(PHONE)).toBe(true);
		expect(validatePeruvianPaymentId(CCI)).toBe(true);
		expect(validatePeruvianPaymentId(SAMPLE)).toBe(true);
		expect(validatePeruvianPaymentId(`${SAMPLE}${PACKED_PAYMENT_ID_SEP}${PHONE}`)).toBe(true);
		expect(validatePeruvianPaymentId("")).toBe(false);
		expect(validatePeruvianPaymentId(`${SAMPLE}${PACKED_PAYMENT_ID_SEP}12`)).toBe(
			false,
		);
	});

	it("validateStoredPaymentId / display / hydrate go through the catalog", () => {
		expect(usesPackedPaymentId("PEN")).toBe(true);
		expect(usesPackedPaymentId("VEN")).toBe(true);
		expect(usesPackedPaymentId("CUP")).toBe(false);
		expect(validateStoredPaymentId("PEN", SAMPLE)).toBe(true);
		expect(validateStoredPaymentId("PEN", PHONE)).toBe(true);
		expect(validateStoredPaymentId("PEN", `${CCI}|${PHONE}`)).toBe(true);
		expect(validateStoredPaymentId("PEN", `${SAMPLE}${PACKED_PAYMENT_ID_SEP}${CCI}|${PHONE}`)).toBe(
			true,
		);
		expect(formatStoredPaymentIdForDisplay("PEN", SAMPLE)).toBe("");
		expect(formatStoredPaymentIdForDisplay("PEN", CCI)).toBe(`CCI: ${CCI}`);
		expect(formatStoredPaymentIdForDisplay("PEN", `${PHONE}|${CCI}`)).toBe(
			`Yape / Plin phone: ${PHONE} | CCI: ${CCI}`,
		);
		expect(formatStoredPaymentIdForDisplay("PEN", `${CCI}|${PHONE}`)).toBe(
			`Yape / Plin phone: ${PHONE} | CCI: ${CCI}`,
		);
		expect(
			assignStoredPaymentIdToFieldValues(
				"PEN",
				`${SAMPLE}${PACKED_PAYMENT_ID_SEP}${PHONE}|${CCI}`,
			),
		).toEqual({ phone: PHONE, cci: CCI });
		expect(assignStoredPaymentIdToFieldValues("PEN", `${CCI}|${PHONE}`)).toEqual({
			phone: PHONE,
			cci: CCI,
		});
		expect(assignStoredPaymentIdToFieldValues("PEN", SAMPLE)).toEqual({ phone: "", cci: "" });
		expect(
			assignPaymentIdToFieldValues(
				PEN_PAYMENT_FIELDS,
				`${SAMPLE}${PACKED_PAYMENT_ID_SEP}${PHONE}`,
			),
		).toEqual({
			phone: PHONE,
			cci: "",
		});
	});

	it("packStoredPaymentId / getStoredQrPayload are currency-agnostic", () => {
		expect(packStoredPaymentId("PEN", SAMPLE, { phone: PHONE, cci: CCI })).toBe(
			`${SAMPLE}${PACKED_PAYMENT_ID_SEP}${PHONE}|${CCI}`,
		);
		expect(packStoredPaymentId("PEN", SAMPLE, { phone: PHONE, cci: "" })).toBe(
			`${SAMPLE}${PACKED_PAYMENT_ID_SEP}${PHONE}|`,
		);
		expect(packStoredPaymentId("PEN", SAMPLE, { phone: "12", cci: "" })).toBe(
			`${SAMPLE}${PACKED_PAYMENT_ID_SEP}12|`,
		);
		expect(
			validateStoredPaymentId(
				"PEN",
				packStoredPaymentId("PEN", SAMPLE, { phone: "12", cci: "" }),
			),
		).toBe(false);
		expect(packStoredPaymentId("PEN", null, { phone: PHONE, cci: "" })).toBe(`${PHONE}|`);
		expect(getStoredQrPayload("PEN", SAMPLE)).toBe(SAMPLE);
		expect(getStoredQrPayload("PEN", `${SAMPLE}${PACKED_PAYMENT_ID_SEP}${PHONE}`)).toBe(SAMPLE);
		expect(getStoredQrPayload("PEN", PHONE)).toBeNull();
		expect(getStoredQrPayload("INR", SAMPLE)).toBeNull();

		const venQr = `${"A".repeat(48)}?merchantId=0134&origin=app`;
		expect(
			packStoredPaymentId("VEN", venQr, {
				phone: "04121234567",
				rif: "V12345678",
				bank: "Banesco",
			}),
		).toBe(`${venQr}||04121234567|V12345678|Banesco`);
		expect(
			packStoredPaymentId("VEN", venQr, {
				phone: "04121234567",
				rif: "",
				bank: "",
			}),
		).toBe(`${venQr}||04121234567||`);
		expect(
			validateStoredPaymentId(
				"VEN",
				packStoredPaymentId("VEN", venQr, {
					phone: "04121234567",
					rif: "",
					bank: "",
				}),
			),
		).toBe(false);
		expect(getStoredQrPayload("VEN", venQr)).toBe(venQr);
		expect(getStoredQrPayload("VEN", "04121234567|V12345678|Banesco")).toBeNull();
	});
});

describe("validatePeruvianPhone / validatePeruvianCci", () => {
	it("splits the combined payment-key rules", () => {
		expect(validatePeruvianPhone("987654321")).toBe(true);
		expect(validatePeruvianPhone("00212345678901234567")).toBe(false);
		expect(validatePeruvianCci("00212345678901234567")).toBe(true);
		expect(validatePeruvianCci("987654321")).toBe(false);
	});
});

describe("validatePeruvianQr (PEN)", () => {
	const SAMPLE =
		"0002010102113932acfba6cb922753c690f09280f365d7a25204561153036045802PE5906YAPERO6004Lima6304ECE9";

	it("accepts the real Yape QR sample", () => {
		expect(validatePeruvianQr(SAMPLE)).toBe(true);
	});

	it("rejects a payload with a non-604 currency (tag 53)", () => {
		const tweaked = SAMPLE.replace("5303604", "5303840");
		expect(validatePeruvianQr(tweaked)).toBe(false);
	});

	it("rejects a payload with a corrupted CRC", () => {
		const corrupted = SAMPLE.replace("6304ECE9", "6304FFFF");
		expect(validatePeruvianQr(corrupted)).toBe(false);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
	])("rejects %s", (_label, input) => {
		expect(validatePeruvianQr(input)).toBe(false);
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

// ── ECU ───────────────────────────────────────────────────────────────────────

describe("validateEcuadorianCedula (ECU)", () => {
	it.each([
		["valid Pichincha cédula", "1710034065"],
		["valid cédula with surrounding spaces", " 1710034065 "],
		["valid 13-digit natural-person RUC", "1710034065001"],
	])("accepts %s", (_label, input) => {
		expect(validateEcuadorianCedula(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["too short (9 digits)", "171003406"],
		["wrong length (11 digits)", "17100340650"],
		["bad province (99)", "9910034065"],
		["third digit >= 6", "1760034065"],
		["failed checksum", "1710034066"],
	])("rejects %s", (_label, input) => {
		expect(validateEcuadorianCedula(input)).toBe(false);
	});
});

describe("validateEcuadorianAccountNumber (ECU)", () => {
	it.each([
		["8-digit account", "21001234"],
		["account with dashes (stripped)", "2100-1234-56"],
	])("accepts %s", (_label, input) => {
		expect(validateEcuadorianAccountNumber(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["too short (3 digits)", "123"],
		["letters only", "abcd"],
	])("rejects %s", (_label, input) => {
		expect(validateEcuadorianAccountNumber(input)).toBe(false);
	});
});

describe("validateEcuadorianAccountName (ECU)", () => {
	it.each([
		["simple name", "Juan Perez"],
		["accented name", "José Muñoz"],
		["name with apostrophe", "O'Brien"],
	])("accepts %s", (_label, input) => {
		expect(validateEcuadorianAccountName(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["single char", "J"],
		["leading digit", "1Juan"],
	])("rejects %s", (_label, input) => {
		expect(validateEcuadorianAccountName(input)).toBe(false);
	});
});

// ── PHP ───────────────────────────────────────────────────────────────────────────

describe("validatePhilippinePhoneNumber (PHP)", () => {
	it.each([
		["10-digit number starting with 9", "9171234567"],
		["local 11-digit 09 format", "09171234567"],
		["number with spaces (stripped)", "0917 123 4567"],
		["number with dashes (stripped)", "0917-123-4567"],
		["number with +63 country code", "+63 9171234567"],
		["number with 63 prefix", "639171234567"],
	])("accepts %s", (_label, input) => {
		expect(validatePhilippinePhoneNumber(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["landline (does not start with 9)", "8171234567"],
		["too short (9 digits)", "917123456"],
		["too long (11 digits not starting with 0)", "91712345678"],
		["letters", "91712345a7"],
	])("rejects %s", (_label, input) => {
		expect(validatePhilippinePhoneNumber(input)).toBe(false);
	});
});

// ── BOB ───────────────────────────────────────────────────────────────────────

describe("validateBolivianAccount (BOB)", () => {
	it.each([
		["8-digit account", "12345678"],
		["20-digit account", "12345678901234567890"],
		["account with spaces (stripped)", "1234 5678 9012"],
		["account with dashes (stripped)", "1234-5678-9012"],
	])("accepts %s", (_label, input) => {
		expect(validateBolivianAccount(input)).toBe(true);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
		["too short (7 digits)", "1234567"],
		["too long (21 digits)", "123456789012345678901"],
		["contains letters", "1234567a"],
	])("rejects %s", (_label, input) => {
		expect(validateBolivianAccount(input)).toBe(false);
	});
});

describe("validateBolivianQr (BOB)", () => {
	function tlv(tag: string, value: string): string {
		return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
	}

	const inner = `000201${tlv("53", "068")}${tlv("58", "BO")}${tlv("59", "TIENDA")}`;
	const SAMPLE = `${inner}6304${calculateCRC16(inner)}`;

	// Real Bolivia QR Simple encrypted envelopes (`<base64>|<hex checksum>`).
	// BancoSol/Yape use a 32-hex checksum; Banco Fie uses a 24-hex checksum.
	const BANCOSOL_QR =
		"rqeunYVqZLSBH9wP9g9edc2eo8ywIMBYO4Hp6zkL7K/lvplzVgpBfA7UA7nH6aNP7wnaDJe41h4YBHYVo8VCaYpigvLPxmRdbIrykn2IFuJUi+2fCfY2Do7EtQU11c8JyZ0C1L5KRe5I4E59r9zeghuVQUUNtgaSsZS+mqqVQ5z0EDqo21xVmLjD3PWVY/4LJpz9Cn8aFSwGPVk7fUd9SUpCGV812+IK9K1fE2okI+rtKmyWANBFWCUyz3EE2pvoRjMh6EosPnGzU1cRDapU0ZcOnsZAryOrXQz7d0WM/rn6OHm5rW+a5OVt93YqOqfNLXW2VYQPVbTg85+UlkQIpw==|07F204D5938E28075E5BF22340391EE1";
	const YAPE_QR =
		"zwUp1HWQXCJtIOpnzdz0Va5PY3tpogHLdas/RqJIfNuBldNxmwHleCdbkeKpOLm1kEsm/geWQFIQ8Mwzd3Paz26FhXY/uxt39LdKP2wRimF89iBRlfJkymXCZngbsEnLOO2Uwam8z7QqCCuIQK9qClaVKt8nB7mqEwgJR6/QZW5lD/AqPcxCz+xMuvSGONv1ve+lfWgEcrm0nWyso4qxSdeyGXbO3QVg5FcfFg9MAJXLkD4flE16RAvpEMWcs5OV5gUh2w6UOec44U4ZPwhQXaHE97nEt8blcN9zogIE9HhSaU+iA2pulgAyRZEOo83lXor4nm5zOhoif8kQUxsllg==|0FABBA22E4072538599B68591360A676";
	const BANCO_FIE_QR =
		"UGbUtEEepdB6Lu0ZjvDh5rCdCUUw9mc8i8+lV0amjuD94l//AN/b4sE1OkUqxb5MR2WwIAe8L97Ax6GEUc0EAcWk/gA/mqwmoLqdUpJGzSqBFo+FcdjRevpIxNrkBj4L3IM6my02LUbDZUdpoeFzrQ/rJoPu/qtrrf+7JAw2GOSoOGl5jBS2IH6E11geLOs85G7hLkSI8YmI39WbAFqL0mmt+B13CZg5owV2LO9Ul3v9KMbg0D90oL9jk39bxwzuYxAOe5AjoUb4WxdIEO05OaWG2H6St0O4ygHDpTUEg+j10IlqCCBM1h7inYU/BON7S3GSS9OahIt3QnbUqzyRuQ==|76b7a1c09287d8f0a3242c7c";

	it("accepts a valid QR Simple payload (country BO, currency 068, valid CRC)", () => {
		expect(validateBolivianQr(SAMPLE)).toBe(true);
	});

	it.each([
		["BancoSol (32-hex checksum)", BANCOSOL_QR],
		["Yape Bs (32-hex checksum)", YAPE_QR],
		["Banco Fie (24-hex checksum)", BANCO_FIE_QR],
	])("accepts real encrypted envelope: %s", (_label, qr) => {
		expect(validateBolivianQr(qr)).toBe(true);
	});

	it("rejects a payload with a non-068 currency (tag 53)", () => {
		const tweaked = `000201${tlv("53", "840")}${tlv("58", "BO")}${tlv("59", "TIENDA")}`;
		const bad = `${tweaked}6304${calculateCRC16(tweaked)}`;
		expect(validateBolivianQr(bad)).toBe(false);
	});

	it("rejects a payload with a corrupted CRC", () => {
		const corrupted = SAMPLE.replace(/6304[0-9A-F]{4}$/, "6304FFFF");
		expect(validateBolivianQr(corrupted)).toBe(false);
	});

	it.each([
		["empty string", ""],
		["whitespace only", "   "],
	])("rejects %s", (_label, input) => {
		expect(validateBolivianQr(input)).toBe(false);
	});
});

describe("BOB stored payment id (QR upload + account)", () => {
	function tlv(tag: string, value: string): string {
		return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
	}

	const inner = `000201${tlv("53", "068")}${tlv("58", "BO")}${tlv("59", "TIENDA")}`;
	const QR = `${inner}6304${calculateCRC16(inner)}`;
	const ACCOUNT = "12345678901";

	it("accepts QR-only, account-only, and packed QR||account", () => {
		expect(usesPackedPaymentId("BOB")).toBe(true);
		expect(validateStoredPaymentId("BOB", QR)).toBe(true);
		expect(validateStoredPaymentId("BOB", ACCOUNT)).toBe(true);
		expect(validateStoredPaymentId("BOB", `${QR}${PACKED_PAYMENT_ID_SEP}${ACCOUNT}`)).toBe(true);
	});

	it("packs and extracts the QR payload", () => {
		expect(packStoredPaymentId("BOB", QR, { account: ACCOUNT })).toBe(
			`${QR}${PACKED_PAYMENT_ID_SEP}${ACCOUNT}`,
		);
		expect(packStoredPaymentId("BOB", QR, { account: "12" })).toBe(
			`${QR}${PACKED_PAYMENT_ID_SEP}12`,
		);
		expect(
			validateStoredPaymentId("BOB", packStoredPaymentId("BOB", QR, { account: "12" })),
		).toBe(false);
		expect(packStoredPaymentId("BOB", null, { account: ACCOUNT })).toBe(ACCOUNT);
		expect(getStoredQrPayload("BOB", QR)).toBe(QR);
		expect(getStoredQrPayload("BOB", `${QR}${PACKED_PAYMENT_ID_SEP}${ACCOUNT}`)).toBe(QR);
		expect(getStoredQrPayload("BOB", ACCOUNT)).toBeNull();
	});

	it("displays the account, never the raw QR blob", () => {
		expect(formatStoredPaymentIdForDisplay("BOB", QR)).toBe("");
		expect(formatStoredPaymentIdForDisplay("BOB", ACCOUNT)).toBe(ACCOUNT);
		expect(assignStoredPaymentIdToFieldValues("BOB", `${QR}${PACKED_PAYMENT_ID_SEP}${ACCOUNT}`)).toEqual(
			{ account: ACCOUNT },
		);
	});
});

describe("validateCatalogPaymentDraft", () => {
	const venQr = `${"A".repeat(48)}?merchantId=0134&origin=app`;
	const venFields = {
		phone: "04121234567",
		rif: "V12345678",
		bank: "Banesco",
	};

	it("accepts QR-only, typed-only, or both for VEN", () => {
		expect(validateCatalogPaymentDraft("VEN", venQr, { phone: "", rif: "", bank: "" })).toBe(
			true,
		);
		expect(validateCatalogPaymentDraft("VEN", null, venFields)).toBe(true);
		expect(validateCatalogPaymentDraft("VEN", venQr, venFields)).toBe(true);
	});

	it("rejects an empty draft and a partial typed trio", () => {
		expect(validateCatalogPaymentDraft("VEN", null, { phone: "", rif: "", bank: "" })).toBe(
			false,
		);
		expect(
			validateCatalogPaymentDraft("VEN", venQr, {
				phone: "04121234567",
				rif: "",
				bank: "",
			}),
		).toBe(false);
		expect(
			validateCatalogPaymentDraft("VEN", null, {
				phone: "04121234567",
				rif: "",
				bank: "",
			}),
		).toBe(false);
	});

	it("accepts PEN QR-only and rejects QR plus an invalid phone", () => {
		const penQr =
			"0002010102113932acfba6cb922753c690f09280f365d7a25204561153036045802PE5906YAPERO6004Lima6304ECE9";
		expect(validateCatalogPaymentDraft("PEN", penQr, { phone: "", cci: "" })).toBe(true);
		expect(validateCatalogPaymentDraft("PEN", penQr, { phone: "987654321", cci: "" })).toBe(
			true,
		);
		expect(validateCatalogPaymentDraft("PEN", penQr, { phone: "12", cci: "" })).toBe(false);
		expect(validateCatalogPaymentDraft("PEN", null, { phone: "12", cci: "" })).toBe(false);
	});

	it("accepts BOB QR-only and rejects QR plus a short account", () => {
		function tlv(tag: string, value: string): string {
			return `${tag}${value.length.toString().padStart(2, "0")}${value}`;
		}
		const inner = `000201${tlv("53", "068")}${tlv("58", "BO")}${tlv("59", "TIENDA")}`;
		const bobQr = `${inner}6304${calculateCRC16(inner)}`;
		expect(validateCatalogPaymentDraft("BOB", bobQr, { account: "" })).toBe(true);
		expect(validateCatalogPaymentDraft("BOB", bobQr, { account: "12345678901" })).toBe(true);
		expect(validateCatalogPaymentDraft("BOB", bobQr, { account: "12" })).toBe(false);
		expect(validateCatalogPaymentDraft("BOB", null, { account: "12" })).toBe(false);
	});
});
