import { CURRENCY } from "../../constants";
import type { CountryOption, PaymentIdFieldConfig } from "../types";

export const BRL_PLACEHOLDER = "Chave pix ou pix copia e cola";
export const BRL_VALIDATION_ERROR = "Please enter a valid PIX ID";

/** Validates CPF (Brazilian tax ID for individuals). */
function validateCPF(cpf: string): boolean {
	if (cpf.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(cpf)) return false;

	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += parseInt(cpf[i], 10) * (10 - i);
	}
	let remainder = sum % 11;
	const firstDigit = remainder < 2 ? 0 : 11 - remainder;
	if (parseInt(cpf[9], 10) !== firstDigit) return false;

	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += parseInt(cpf[i], 10) * (11 - i);
	}
	remainder = sum % 11;
	const secondDigit = remainder < 2 ? 0 : 11 - remainder;
	return parseInt(cpf[10], 10) === secondDigit;
}

/** Validates CNPJ (Brazilian tax ID for companies). */
function validateCNPJ(cnpj: string): boolean {
	if (cnpj.length !== 14) return false;
	if (/^(\d)\1{13}$/.test(cnpj)) return false;

	let sum = 0;
	const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	for (let i = 0; i < 12; i++) {
		sum += parseInt(cnpj[i], 10) * weights1[i];
	}
	let remainder = sum % 11;
	const firstDigit = remainder < 2 ? 0 : 11 - remainder;
	if (parseInt(cnpj[12], 10) !== firstDigit) return false;

	sum = 0;
	const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	for (let i = 0; i < 13; i++) {
		sum += parseInt(cnpj[i], 10) * weights2[i];
	}
	remainder = sum % 11;
	const secondDigit = remainder < 2 ? 0 : 11 - remainder;
	return parseInt(cnpj[13], 10) === secondDigit;
}

/**
 * Validates PIX ID format.
 * PIX can be: CPF (11 digits), CNPJ (14 digits), email, phone (10–11 digits or E.164),
 * random key (UUID), or a PIX "copia e cola" EMV QR payload (starts with 000201).
 */
export function validatePIXId(pixId: string): boolean {
	if (!pixId || pixId.trim().length === 0) return false;

	const trimmedPixId = pixId.trim();

	// PIX "copia e cola" — EMV QR code payload
	if (/^000201/.test(trimmedPixId)) return true;

	// 11 digits: valid CPF or Brazilian mobile phone key (DDD 11–99 + digit 9 + 8 digits)
	if (/^\d{11}$/.test(trimmedPixId))
		return validateCPF(trimmedPixId) || /^[1-9][1-9]9\d{8}$/.test(trimmedPixId);
	if (/^\d{14}$/.test(trimmedPixId)) return validateCNPJ(trimmedPixId);
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedPixId)) return true;
	// Phone key: 10–11 digits (with or without country code prefix)
	if (/^\d{10,11}$/.test(trimmedPixId)) return true;
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedPixId))
		return true;

	return false;
}

/** Payment ID field configuration for BRL (Brazil, PIX). */
export const BRL_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "pix",
		label: "PIX_ID",
		placeholder: BRL_PLACEHOLDER,
		displayLabel: "PIX ID",
		validate: validatePIXId,
		validationErrorMessage: BRL_VALIDATION_ERROR,
	},
];

/** Country option for Brazil (BRL). */
export const BRL_COUNTRY_OPTION: CountryOption = {
	country: "Brazil",
	currency: CURRENCY.BRL,
	symbolNative: "R$",
	locale: "pt-BR",
	paymentMethod: "PIX",
	paymentAddressName: "PIX_ID",
	timezone: "America/Sao_Paulo",
	timezone_name: "BRT",
	flag: "🇧🇷",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f1e7-1f1f7.png",
	phoneCode: "+55",
	telegramSupportChannel: "https://t.me/p2pmebrasil",
	twitterUsername: "p2pmebrasil",
	smsCountryCodes: ["BR"],
	precision: 2,
	isAlpha: false,
	disabled: false,
	disabledPaymentTypes: [],
};
