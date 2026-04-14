import { CURRENCY } from "../../constants";
import type { CountryOption, PaymentIdFieldConfig } from "../types";
import { EUR_PLACEHOLDER, EUR_VALIDATION_ERROR, validateRevolutId } from "./eur";

export const USD_PLACEHOLDER = EUR_PLACEHOLDER;
export const USD_VALIDATION_ERROR = EUR_VALIDATION_ERROR;

/** Payment ID field configuration for USD (Revolut USD). */
export const USD_PAYMENT_FIELDS: PaymentIdFieldConfig[] = [
	{
		key: "revolut",
		label: "REVOLUT_ID",
		placeholder: USD_PLACEHOLDER,
		displayLabel: "Revolut ID",
		validate: validateRevolutId,
		validationErrorMessage: USD_VALIDATION_ERROR,
	},
];

/** Country option for Revolut USD. */
export const USD_COUNTRY_OPTION: CountryOption = {
	country: "Revolut USD",
	currency: CURRENCY.USD,
	symbolNative: "$",
	locale: "en-US",
	paymentMethod: "REVOLUT",
	paymentAddressName: "REVOLUT_ID",
	timezone: "America/New_York",
	timezone_name: "EST",
	flag: "",
	flagUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f310.png",
	phoneCode: "+1",
	telegramSupportChannel: "https://t.me/P2Pdotme",
	twitterUsername: "P2Pdotme",
	smsCountryCodes: ["US"],
	precision: 2,
	isAlpha: true,
	disabled: false,
	disabledPaymentTypes: ["PAY"],
};
