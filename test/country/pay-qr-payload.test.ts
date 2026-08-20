import { describe, expect, it } from "vitest";
import {
	assignStoredPaymentIdToFieldValues,
	formatStoredPaymentIdForDisplay,
	getPayQrPayload,
	getStoredQrPayload,
	PACKED_PAYMENT_ID_SEP,
} from "../../src/country";

const PEN_QR =
	"0002010102113932acfba6cb922753c690f09280f365d7a25204561153036045802PE5906YAPERO6004Lima6304ECE9";
const PEN_BAD_CRC = PEN_QR.replace("6304ECE9", "6304FFFF");
const PHP_QR =
	"00020101021127830012com.p2pqrpay0111GXCHPHM2XXX02081234567803150000000000000000417TESTTESTTESTTEST15204601653036085802PH5909TEST SHOP6006Manila61041000630476A9";
const VEN_PAY =
	"dBKxwilNo3+ATaUX7YpeGfb+DOGtIBnj2DpAypb7U6gqar/JxjhLFaXIKyv9O+Z6xh3rX2B6huFupypAZjcj0istG7bYvJ5XO3NfqXYAeVR+hEwkuuBBcCy+9MKH7OJMvDGEXU143a7+bgcrTjaCzQ==?merchantId=0163&strong_id=1786921164-3";
const VEN_LOOSE = "SGVsbG9Xb3JsZA==?param=1";
const VEN_COMPOUND = "04121234567|V12345678|Banesco";
const PHP_COMPOUND = "9171234567|GCash";
const PEN_PHONE = "987654321";

describe("getPayQrPayload", () => {
	it("returns a valid PEN upload QR via getStoredQrPayload first", () => {
		expect(getStoredQrPayload("PEN", PEN_QR)).toBe(PEN_QR);
		expect(getPayQrPayload("PEN", PEN_QR)).toBe(PEN_QR);
	});

	it("returns a PEN PAY blob whose CRC fails validateQr", () => {
		expect(getStoredQrPayload("PEN", PEN_BAD_CRC)).toBeNull();
		expect(getPayQrPayload("PEN", PEN_BAD_CRC)).toBe(PEN_BAD_CRC);
		expect(getPayQrPayload("PEN", `${PEN_BAD_CRC}${PACKED_PAYMENT_ID_SEP}${PEN_PHONE}`)).toBe(
			PEN_BAD_CRC,
		);
	});

	it("does not treat a PEN phone or CCI as a QR", () => {
		expect(getPayQrPayload("PEN", PEN_PHONE)).toBeNull();
		expect(getPayQrPayload("PEN", "00212345678901234567")).toBeNull();
	});

	it("returns a VEN PAY envelope, including ones that fail SELL validateQr", () => {
		expect(getPayQrPayload("VEN", VEN_PAY)).toBe(VEN_PAY);
		expect(getStoredQrPayload("VEN", VEN_LOOSE)).toBeNull();
		expect(getPayQrPayload("VEN", VEN_LOOSE)).toBe(VEN_LOOSE);
	});

	it("does not treat a VEN compound phone|rif|bank as a QR", () => {
		expect(getPayQrPayload("VEN", VEN_COMPOUND)).toBeNull();
	});

	it("returns a PHP QR Ph blob and ignores InstaPay phone|bank", () => {
		expect(getStoredQrPayload("PHP", PHP_QR)).toBeNull();
		expect(getPayQrPayload("PHP", PHP_QR)).toBe(PHP_QR);
		expect(getPayQrPayload("PHP", PHP_COMPOUND)).toBeNull();
	});

	it("does not dump a PHP PAY blob into Phone Number / Bank Name", () => {
		expect(assignStoredPaymentIdToFieldValues("PHP", PHP_QR)).toEqual({
			phone: "",
			"bank-name": "",
		});
		expect(formatStoredPaymentIdForDisplay("PHP", PHP_QR)).toBe("");
		expect(assignStoredPaymentIdToFieldValues("PHP", PHP_COMPOUND)).toEqual({
			phone: "9171234567",
			"bank-name": "GCash",
		});
	});
});
