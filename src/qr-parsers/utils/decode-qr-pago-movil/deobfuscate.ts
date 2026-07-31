import forge from "node-forge";

let _Blowfish: any;
function getBlowfish(): any {
	if (!_Blowfish) _Blowfish = require("blowfish");
	return _Blowfish;
}

export interface EncryptedString {
	index: number;
	method: "I" | "l" | "lI";
	data: string;
	key: string;
}

function md5(str: string): string {
	const md = forge.md.md5.create();
	md.update(str);
	return md.digest().getBytes();
}

function pkcs7Unpad(raw: string): string {
	if (raw.length === 0) return raw;
	const lastChar = raw.charCodeAt(raw.length - 1);
	if (lastChar >= 1 && lastChar <= 8) {
		const padLen = lastChar;
		let ok = true;
		for (let i = 1; i <= padLen; i++) {
			if (raw.charCodeAt(raw.length - i) !== padLen) {
				ok = false;
				break;
			}
		}
		if (ok) return raw.substring(0, raw.length - padLen);
	}
	return raw;
}

function decryptDES(encoded: string, keyStr: string): string {
	const key = md5(keyStr).substring(0, 8);
	const decipher = forge.cipher.createDecipher("DES-ECB", forge.util.createBuffer(key));
	decipher.start({ padding: true } as any);
	decipher.update(forge.util.createBuffer(forge.util.decode64(encoded)));
	decipher.finish();
	return decipher.output.toString();
}

function decryptBlowfish(encoded: string, keyStr: string): string {
	const hash = md5(keyStr);
	const bf = new (getBlowfish())(hash);
	const hex = forge.util.bytesToHex(forge.util.decode64(encoded)).toUpperCase();
	const dec = bf.decrypt(hex);
	return pkcs7Unpad(dec);
}

function decryptXOR(encoded: string, keyStr: string): string {
	const data = forge.util.decode64(encoded);
	let result = "";
	for (let i = 0; i < data.length; i++) {
		result += String.fromCharCode(data.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length));
	}
	return result;
}

export function decode(method: string, data: string, key: string): string {
	if (method === "I") return decryptDES(data, key);
	if (method === "l") return decryptBlowfish(data, key);
	if (method === "lI") return decryptXOR(data, key);
	throw new Error("Unknown method: " + method);
}

export interface KeyMaps {
	aesKeys: Record<string, { key: string; iv: string }>;
	rsaKeys: Record<string, string>;
}

export function buildKeyMaps(strings: EncryptedString[]): KeyMaps {
	const I: string[] = [];
	for (const s of strings) I[s.index] = decode(s.method, s.data, s.key);

	const aesKeys: Record<string, { key: string; iv: string }> = {};
	for (let k = 0; k <= 228; k += 4) {
		const mid = I[k];
		if (!mid || !I[k + 1] || !I[k + 2]) break;
		aesKeys[mid] = { key: I[k + 1] as any, iv: I[k + 2] as any };
	}

	const rsaKeys: Record<string, string> = {};
	for (let k = 233; k < 750; k += 9) {
		const mid = I[k];
		if (!mid) break;
		const parts: string[] = [];
		for (let j = 0; j < 8; j++) {
			if (I[k + 1 + j]) parts.push(I[k + 1 + j] as any);
		}
		if (parts.length < 7) break;
		rsaKeys[mid] = [0, 1, 2, 3, 4, 5, 6].map((i) => parts[i]).join("");
	}

	return { aesKeys, rsaKeys };
}
