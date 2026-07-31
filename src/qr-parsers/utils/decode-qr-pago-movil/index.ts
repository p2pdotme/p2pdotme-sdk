import type { QrData } from "./decrypt";
import { QrDecoder } from "./decrypt";
import { aesKeys, rsaKeys } from "./keys-processed";

const decoder = new QrDecoder({ aesKeys, rsaKeys });

export function decodeQr(payload: string): QrData {
	return decoder.decode(payload);
}
