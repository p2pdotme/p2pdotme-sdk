import { describe, expect, it } from "vitest";
import {
	formatStoredPaymentIdForDisplay,
	getPayQrPayload,
	getStoredQrPayload,
} from "../../src/country";

/**
 * Scan & Pay countries whose `CountryOption` still has no `getPayQrPayload`.
 * Parsers already exist (`test/qr-parsers/*`); the receipt/drawer catalog hook
 * does not.
 *
 * Assertions here document the gap (`null` / blob dumped as text). When a hook
 * lands, flip: `getPayQrPayload(currency, blob)` → `blob`, and
 * `formatStoredPaymentIdForDisplay` must not equal the blob. SELL short-ID
 * tests in the first describe must stay `null`.
 */

const ARS_QR =
	"00020101021126410016com.mercadolibre0109111111111020400005204000053030325802AR5911PERSONA UNO6008CIUDAD B630467A9";
const BRL_PIX =
	"00020126340014BR.GOV.BCB.PIX0112foo@bar.test5204000053039865406150.005802BR5914NOME RECEBEDOR6008CIDADE A62100506PED00163045F53";
const IDR_QRIS =
	"00020101021126430017ID.CO.EXAMPLE.WWW01189360098800009876545204541153033605802ID5915TOKO CONTOH DUA600905 KOTA B";
const NGN_SPD = "SPD*1.0*ACC:1234567890*AM:40,000.00*MSG:Test*";
const COP_EMV = "0002010102115204000053031705802CO5913TEST MERCHANT6304ABCD";
const CUP_TM = "TRANSFERMOVIL_ETECSA,TRANSFERENCIA,9204959800000000,58555555,";
const ECU_DEUNA = "https://pagar.deuna.app/demo/merchant?id=demomerchant123";

describe("SELL short IDs must never become a PAY QR", () => {
	it.each([
		["ARS", "juan.perez"],
		["BRL", "foo@bar.test"],
		["IDR", "8123456789"],
		["NGN", "1234567890"],
		["COP", "3001234567"],
		["CUP", "58555555|9204959800000000"],
		["MEX", "012345678901234567"],
	] as const)("%s typed / compound id is not a QR", (currency, id) => {
		expect(getPayQrPayload(currency, id)).toBeNull();
		expect(getStoredQrPayload(currency, id)).toBeNull();
	});
});

describe("typed-only currencies have no PAY QR hook", () => {
	it("MEX / EUR / USD stay null", () => {
		expect(getPayQrPayload("MEX", "012345678901234567")).toBeNull();
		expect(getPayQrPayload("EUR", "@alice")).toBeNull();
		expect(getPayQrPayload("USD", "@alice")).toBeNull();
	});
});

describe("unwired PAY blobs (getPayQrPayload is still null)", () => {
	it.each([
		["ARS", ARS_QR],
		["BRL", BRL_PIX],
		["IDR", IDR_QRIS],
		["NGN", NGN_SPD],
		["COP", COP_EMV],
		["CUP", CUP_TM],
		["ECU", ECU_DEUNA],
	] as const)("%s scanned blob is not a catalog PAY QR yet", (currency, blob) => {
		expect(getPayQrPayload(currency, blob)).toBeNull();
		expect(getStoredQrPayload(currency, blob)).toBeNull();
	});

	it("ARS / BRL / IDR one-field catalogs dump the PAY blob as display text", () => {
		expect(formatStoredPaymentIdForDisplay("ARS", ARS_QR)).toBe(ARS_QR);
		expect(formatStoredPaymentIdForDisplay("BRL", BRL_PIX)).toBe(BRL_PIX);
		expect(formatStoredPaymentIdForDisplay("IDR", IDR_QRIS)).toBe(IDR_QRIS);
	});
});
