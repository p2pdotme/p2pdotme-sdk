import forge from "node-forge";

export interface QrData {
	dni: string;
	phone: string;
	bank: string;
}

export interface KeyMaps {
	aesKeys: Record<string, { key: string; iv: string }>;
	rsaKeys: Record<string, string>;
}

function normalize(raw: Record<string, any>): QrData {
	const id = String(raw.id ?? "");
	let phone = String(raw.phone ?? "");
	if (phone.startsWith("58")) {
		phone = "0" + phone.slice(2);
	} else if (phone && !phone.startsWith("0")) {
		phone = "0" + phone;
	}
	return {
		dni: id.startsWith("V") ? id : "V" + id,
		phone,
		bank: String(raw.bank ?? ""),
	};
}

function aesDecrypt(qrData: string, merchantId: string, aesKeys: KeyMaps["aesKeys"]): string {
	const k = aesKeys[merchantId];
	if (!k) throw new Error(`No AES key for merchant ${merchantId}`);

	const decipher = forge.cipher.createDecipher("AES-CBC", forge.util.createBuffer(k.key));
	decipher.start({ iv: forge.util.createBuffer(k.iv) });
	decipher.update(forge.util.createBuffer(forge.util.decode64(qrData)));
	if (!decipher.finish()) throw new Error("AES decryption failed");
	return decipher.output.toString();
}

function rsaDecrypt(qrData: string, merchantId: string, rsaKeys: KeyMaps["rsaKeys"]): string {
	const pem = rsaKeys[merchantId];
	if (!pem) throw new Error(`No RSA key for merchant ${merchantId}`);

	const asn1 = forge.asn1.fromDer(forge.util.createBuffer(forge.util.decode64(pem)));
	const privateKey = forge.pki.privateKeyFromAsn1(asn1);
	return privateKey.decrypt(forge.util.decode64(qrData), "RSAES-PKCS1-V1_5");
}

export class QrDecoder {
	constructor(private keys: KeyMaps) {}

	decode(payload: string): QrData {
		const qi = payload.indexOf("?");
		if (qi === -1) throw new Error("Invalid QR payload format");
		const qrData = payload.substring(0, qi);
		const params = new URLSearchParams(payload.substring(qi + 1));
		const merchantId = params.get("merchantId") || "";
		const origin = params.get("origin") || "app";

		const decrypted =
			origin === "web"
				? rsaDecrypt(qrData, merchantId, this.keys.rsaKeys)
				: aesDecrypt(qrData, merchantId, this.keys.aesKeys);

		return normalize(JSON.parse(decrypted));
	}
}
