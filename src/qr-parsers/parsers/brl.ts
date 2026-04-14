import { err, ok, type Result } from "neverthrow";
import { QRParserError, type QRParserErrorCode } from "../errors";
import type { ParsedQR, ParseQRConfig, ParseResult } from "../types";
import { failure, success } from "../types";
import { parseAmount } from "../utils/amount";
import { verifyCRC16 } from "../utils/crc16";
import { parseTLV } from "../utils/tlv";

const PIX_TAGS = {
	PAYLOAD_FORMAT: "00",
	PIX_KEY_INFO: "26",
	AMOUNT: "54",
	MERCHANT_NAME: "59",
	CRC: "63",
} as const;

function parsePIXKeyInfo(data: string): { pixKey: string | null; location: string | null } {
	const result = { pixKey: null as string | null, location: null as string | null };

	for (const entry of parseTLV(data)) {
		if (entry.tag === "01") {
			if (entry.value.includes("http") || entry.value.includes("://")) {
				result.location = entry.value.startsWith("http") ? entry.value : `https://${entry.value}`;
			} else {
				result.pixKey = entry.value;
			}
		} else if (entry.tag === "25") {
			result.location = entry.value.startsWith("http") ? entry.value : `https://${entry.value}`;
		}
	}

	return result;
}

function safeBase64Decode(base64String: string): string {
	if (typeof globalThis.atob === "function") {
		return globalThis.atob(base64String);
	}
	throw new Error("No base64 decoder available");
}

interface PIXJWTPayload {
	status?: string;
	txid?: string;
	valor?: { original?: string };
	calendario?: { expiracao?: number };
}

function parseJWT(token: string): PIXJWTPayload | null {
	try {
		const parts = token.trim().split(".");
		if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
		const json = safeBase64Decode(parts[1]);
		return JSON.parse(json) as PIXJWTPayload;
	} catch {
		return null;
	}
}

function dynamicErr(
	code: QRParserErrorCode,
	message: string,
): Result<{ dynamicAmount?: string }, QRParserError> {
	return err(new QRParserError(message, { code }));
}

async function fetchDynamicData(
	location: string,
	proxyUrl: string,
	orderId?: string,
): Promise<Result<{ dynamicAmount?: string }, QRParserError>> {
	try {
		const url = new URL(`${proxyUrl}/pix`);
		url.searchParams.set("locationUrl", location);
		if (orderId) {
			url.searchParams.set("orderId", orderId);
		}

		const response = await fetch(url, {
			method: "GET",
			headers: { Accept: "*/*" },
		});

		if (!response.ok) {
			return dynamicErr("FETCH_FAILED", `Proxy error: ${response.status} ${response.statusText}`);
		}

		const jwtToken = await response.text();
		const payload = parseJWT(jwtToken);

		if (!payload) {
			return dynamicErr("FETCH_FAILED", "Failed to parse dynamic PIX response");
		}

		return ok({ dynamicAmount: payload.valor?.original });
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Unknown error";
		return dynamicErr("FETCH_FAILED", `Failed to fetch dynamic PIX data: ${msg}`);
	}
}

export async function parsePIX(
	qrData: string,
	sellPrice: number,
	config: ParseQRConfig,
): Promise<ParseResult> {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	const trimmed = qrData.trim();

	const crc = verifyCRC16(trimmed);
	if (!crc.valid) {
		return failure("INVALID_QR", "Invalid QR checksum");
	}

	const allTags: Record<string, string> = {};
	for (const entry of parseTLV(trimmed)) {
		allTags[entry.tag] = entry.value;
	}

	if (!allTags[PIX_TAGS.PAYLOAD_FORMAT]) {
		return failure("INVALID_QR", "Invalid PIX QR format");
	}

	const merchantName = allTags[PIX_TAGS.MERCHANT_NAME] || "MERCHANT_NOT_FOUND";

	let dynamicAmount: string | undefined;
	const pixKeyData = allTags[PIX_TAGS.PIX_KEY_INFO];
	if (pixKeyData) {
		const { location } = parsePIXKeyInfo(pixKeyData);
		if (location) {
			if (!config.proxyUrl) {
				return failure("FETCH_FAILED", "proxyUrl is required for dynamic PIX QR codes");
			}
			const dynamicResult = await fetchDynamicData(location, config.proxyUrl, config.orderId);
			if (dynamicResult.isErr()) {
				return err(dynamicResult.error);
			}
			dynamicAmount = dynamicResult.value.dynamicAmount;
		}
	}

	const fiatAmountStr = dynamicAmount || allTags[PIX_TAGS.AMOUNT];
	const result: ParsedQR = { paymentAddress: merchantName };

	if (fiatAmountStr) {
		const amount = parseAmount(fiatAmountStr, sellPrice);
		if (amount) {
			result.amount = amount;
		}
	}

	return success(result);
}
