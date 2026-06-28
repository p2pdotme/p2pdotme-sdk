import type { ParseResult } from "../types";
import { failure, success } from "../types";

const DEUNA_HOST = "pagar.deuna.app";

/**
 * Parses a DeUna (Banco Pichincha, Ecuador) payment QR. DeUna QRs are plain URLs of
 * the form `https://pagar.deuna.app/<slug>/merchant?id=<hash>`; the `id` query param
 * is the merchant payment address. DeUna QRs carry no amount, so `_sellPrice` is unused.
 */
export function parseDeUna(qrData: string, _sellPrice: number): ParseResult {
	if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
		return failure("INVALID_QR", "QR data is empty or invalid");
	}

	let url: URL;
	try {
		url = new URL(qrData.trim());
	} catch {
		return failure("INVALID_QR", "Not a valid DeUna URL");
	}

	if (url.hostname !== DEUNA_HOST) {
		return failure("INVALID_QR", `Unexpected DeUna host: ${url.hostname}`);
	}

	const id = url.searchParams.get("id");
	if (!id) {
		return failure("INVALID_QR", "Missing DeUna merchant id");
	}

	return success({ paymentAddress: id });
}
