# `@p2pdotme/sdk/country`

Country and currency configuration for the P2P.me SDK — payment methods, validators, field configs, and country metadata.

## Structure

```
src/country/
├── currencies/          # Per-currency files (single source of truth)
│   ├── inr.ts           # India — UPI
│   ├── idr.ts           # Indonesia — QRIS
│   ├── brl.ts           # Brazil — PIX
│   ├── ars.ts           # Argentina — ALIAS / CBU
│   ├── mex.ts           # Mexico — SPEI / CLABE
│   ├── ven.ts           # Venezuela — Pago Móvil
│   ├── ngn.ts           # Nigeria — NIP
│   ├── cop.ts           # Colombia — Transferencia (Nequi / Daviplata)
│   ├── eur.ts           # Revolut EUR
│   ├── usd.ts           # Revolut USD
│   └── index.ts         # Re-exports all currency files
├── countries.ts         # COUNTRY_OPTIONS — aggregated from currencies/
├── payment-fields.ts    # PAYMENT_ID_FIELDS — aggregated from currencies/
├── validators.ts        # Re-exports all validators + compound utils
├── types.ts             # CountryOption, PaymentIdFieldConfig interfaces
└── index.ts             # Public API
```

Each currency file owns everything for that currency:

| Export | Description |
|--------|-------------|
| `validate*` | Payment ID validator function(s) |
| `*_PAYMENT_FIELDS` | `PaymentIdFieldConfig[]` — field label, placeholder, validator, error message |
| `*_COUNTRY_OPTION` | `CountryOption` — locale, timezone, flag, payment method, feature flags |

## Usage

```typescript
import {
  COUNTRY_OPTIONS,
  PAYMENT_ID_FIELDS,
  validateUPIId,
  validatePIXId,
} from "@p2pdotme/sdk/country";

// All active countries
const active = COUNTRY_OPTIONS.filter((c) => !c.disabled);

// Payment fields for a given currency
const fields = PAYMENT_ID_FIELDS["BRL"];

// Validate a payment ID
validateUPIId("merchant@paytm"); // true
validatePIXId("user@example.com"); // true
```

## Currencies

| Currency | Country | Payment Method | Alpha | Disabled |
|----------|---------|----------------|-------|----------|
| INR | India | UPI | No | No |
| IDR | Indonesia | QRIS | No | No |
| BRL | Brazil | PIX | No | No |
| ARS | Argentina | ALIAS / CBU | No | No |
| MEX | Mexico | SPEI / CLABE | Yes | No |
| VEN | Venezuela | Pago Móvil | Yes | No |
| NGN | Nigeria | NIP | Yes | No |
| COP | Colombia | Transferencia | Yes | Yes |
| EUR | Revolut EUR | Revolut | Yes | No |
| USD | Revolut USD | Revolut | Yes | No |

`isAlpha: true` — feature-flagged, may not be fully available in production.
`disabled: true` — hidden from selection in the UI.

## Validators

| Validator | Currency | Accepts |
|-----------|----------|---------|
| `validateUPIId` | INR | `username@bankname` |
| `validateIndonesianPhoneNumber` | IDR | 9–12 digit phone number |
| `validatePIXId` | BRL | CPF, CNPJ, email, phone (10 digits), UUID |
| `validateArgentinePaymentId` | ARS | CBU/CVU (22 digits with checksum) or Alias (6–20 chars) |
| `validateMexicanPaymentId` | MEX | CLABE (18 digits), card (16 digits), phone (10 digits) |
| `validateVenezuelanPhoneNumber` | VEN | 11-digit number starting with `04` |
| `validateVenezuelanRif` | VEN | Letter prefix (J/V/E/G/C) + 7–9 digits |
| `validateNigerianAccountNumber` | NGN | Exactly 10 digits (NUBAN) |
| `validateColombianPaymentId` | COP | 10-digit phone starting with `3`, or email |
| `validateRevolutId` | EUR/USD | Username, email, or phone |

### Compound payment IDs

Venezuela (VEN) requires three fields: phone, RIF, and bank name. Use the compound utilities to serialize/deserialize:

```typescript
import {
  serializeCompoundPaymentId,
  deserializeCompoundPaymentId,
  formatCompoundPaymentIdForDisplay,
} from "@p2pdotme/sdk/country";

const stored = serializeCompoundPaymentId("04121234567", "V12345678", "Banesco");
// "04121234567|V12345678|Banesco"

const [phone, rif, bank] = deserializeCompoundPaymentId(stored);

const display = formatCompoundPaymentIdForDisplay(stored, ["Phone", "RIF", "Bank"]);
// "Phone: 04121234567 | RIF: V12345678 | Bank: Banesco"
```

## Adding a New Currency

1. Create `src/country/currencies/<code>.ts` exporting:
   - Validator function(s)
   - `<CODE>_PAYMENT_FIELDS: PaymentIdFieldConfig[]`
   - `<CODE>_COUNTRY_OPTION: CountryOption`
2. Add `export * from "./<code>"` to `currencies/index.ts`
3. Add the country option to `countries.ts`
4. Add the payment fields to `payment-fields.ts`
5. Add validator tests to `test/country/validators.test.ts`
