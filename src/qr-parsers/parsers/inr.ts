import type { ParsedQR, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { verifyCRC16 } from "../utils/crc16";
import { extractTags } from "../utils/tlv";

const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

const FONEPAY_COUNTRY_TAG = "58" as const;

/** `upi://<intent>?…` — captures the intent (`pay`, `mandate`, `collect`, …). */
const UPI_SCHEME_REGEX = /^upi:\/\/([^?/]*)/i;

/** The only UPI intent that is a one-off payment. */
const UPI_PAY_INTENT = "pay";

/**
 * Params that only appear on UPI AutoPay / mandate intents (NPCI recurring
 * debits). A QR carrying any of them registers a standing debit on the payer's
 * account instead of making a one-off payment, so it is never payable here.
 */
const UPI_MANDATE_PARAMS = ["recur", "amrule", "validitystart", "validityend", "txnType"] as const;

/** True for anything other than a plain `upi://pay` intent (e.g. `upi://mandate`). */
function isNonPayUpiIntent(payload: string): boolean {
	const intent = UPI_SCHEME_REGEX.exec(payload)?.[1];
	return intent !== undefined && intent.toLowerCase() !== UPI_PAY_INTENT;
}

function hasMandateParams(params: URLSearchParams): boolean {
	const keys = new Set([...params.keys()].map((key) => key.toLowerCase()));
	return UPI_MANDATE_PARAMS.some((param) => keys.has(param.toLowerCase()));
}

/**
 * Values some QR generators serialise into `am=` when no amount was set
 * (JS `undefined`/`null` stringified straight into the query). UPI apps treat
 * such a QR as "payer enters amount", so we do too instead of rejecting it.
 */
const PLACEHOLDER_AMOUNT_VALUES = new Set(["undefined", "null"]);

function readAmountParam(params: URLSearchParams): string | null {
	const raw = params.get("am")?.trim();
	if (!raw || PLACEHOLDER_AMOUNT_VALUES.has(raw.toLowerCase())) return null;
	return raw;
}

/**
 * Fonepay (Nepal NPQR) EMVCo QR. Indian UPI apps can pay these through the
 * NPCI–Fonepay cross-border link, so an INR PAY order accepts them. Detected by
 * the `fonepay.com` reverse-domain marker (merchant account template, tag 26),
 * country tag 58 = `NP`, and a valid EMVCo CRC-16.
 */
function isFonepayQr(payload: string): boolean {
	if (!payload.includes("fonepay.com")) return false;
	if (!verifyCRC16(payload).valid) return false;
	return extractTags(payload, [FONEPAY_COUNTRY_TAG])[FONEPAY_COUNTRY_TAG] === "NP";
}

export function parseUPI(qrData: string, sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	// Fonepay (Nepal) EMVCo QR — returned verbatim as `paymentAddress` so the
	// payer's UPI app can re-render and scan the exact merchant QR. Any embedded
	// amount (tag 54) is denominated in NPR, not INR, so it is not read; the
	// payer enters the amount in their app.
	if (isFonepayQr(trimmed)) {
		return success({ paymentAddress: trimmed });
	}

	// UPI AutoPay mandates (`upi://mandate?…`) and other non-pay intents would
	// set up a recurring debit or collect request, not a one-off payment.
	if (isNonPayUpiIntent(trimmed)) {
		return failure("INVALID_QR", "Only UPI pay QRs are supported (mandate/AutoPay QRs are not)");
	}

	let paramString: string;
	if (/^upi:\/\/pay\?/i.test(trimmed)) {
		paramString = trimmed.substring(10);
	} else if (trimmed.includes("?")) {
		paramString = trimmed.split("?")[1];
	} else {
		paramString = trimmed;
	}

	const params = new URLSearchParams(paramString);
	if (hasMandateParams(params)) {
		return failure("INVALID_QR", "UPI mandate/AutoPay QRs are not supported");
	}

	const pa = params.get("pa");

	if (!pa) {
		return failure("INVALID_QR", "Missing UPI payment address");
	}

	if (!UPI_ID_REGEX.test(pa)) {
		return failure("INVALID_QR", "Invalid UPI ID format");
	}

	const result: ParsedQR = { paymentAddress: pa };

	const amountStr = readAmountParam(params);
	if (amountStr) {
		const amount = parseAmount(amountStr, sellPrice);
		if (!amount) {
			return failure("INVALID_AMOUNT", "Invalid amount in QR");
		}
		result.amount = amount;
	}

	return success(result);
}
