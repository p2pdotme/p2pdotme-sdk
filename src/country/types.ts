import type { CurrencyCode } from "../types";

export interface PaymentIdFieldConfig {
	readonly key: string;
	readonly label: string;
	readonly placeholder: string;
	readonly displayLabel: string | null;
	readonly validate: (value: string) => boolean;
	readonly validationErrorMessage: string;
}

export interface CountryOption {
	readonly country: string;
	readonly currency: CurrencyCode;
	readonly internationalFormat?: string;
	readonly symbolNative: string;
	readonly locale: string;
	readonly paymentMethod: string;
	readonly paymentAddressName: string;
	readonly timezone: string;
	readonly timezone_name: string;
	readonly flag: string;
	readonly phoneCode?: string;
	readonly flagUrl: string;
	readonly telegramSupportChannel: string;
	readonly twitterUsername: string;
	readonly smsCountryCodes: readonly string[];
	readonly precision: number;
	readonly isAlpha: boolean;
	readonly disabled: boolean;
	readonly disabledPaymentTypes: readonly string[];
}
