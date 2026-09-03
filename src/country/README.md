# `@p2pdotme/sdk/country`

Country and currency configuration for the P2P.me SDK — payment methods, validators, field configs, and country metadata.

## Structure

```
├── currencies/          # Per-currency files (single source of truth)
│   ├── inr.ts           # India — UPI
│   ├── idr.ts           # Indonesia — QRIS
│   ├── brl.ts           # Brazil — PIX
│   ├── ars.ts           # Argentina — ALIAS / CBU
│   ├── mex.ts           # Mexico — SPEI / CLABE
│   ├── ven.ts           # Venezuela — Pago Móvil
│   ├── bob.ts           # Bolivia — QR Simple
│   ├── ngn.ts           # Nigeria — NIP
│   ├── cop.ts           # Colombia — Transferencia (Nequi / Daviplata)
│   ├── cup.ts           # Cuba — Transfermóvil (transfers + QR)
│   ├── ecu.ts           # Ecuador — Transferencia / DeUna QR
│   ├── pen.ts           # Peru — Yape / Plin QR / CCI
│   ├── php.ts           # Philippines — InstaPay (GCash / Maya), QR Ph
│   ├── kes.ts           # Kenya — M-Pesa (phone or till number)
│   ├── eur.ts           # Revolut EUR
│   ├── usd.ts           # Revolut USD
│   └── index.ts         # Re-exports all currency files
├── qr-validator.ts      # SELL QR payload checks (PEN / VEN / BOB) — shared by both apps
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
| BOB | Bolivia | QR Simple | Yes | No |
| NGN | Nigeria | NIP | Yes | No |
| COP | Colombia | Transferencia | Yes | Yes |
| CUP | Cuba | Transfermóvil | Yes | No |
| ECU | Ecuador | Transferencia / DeUna | Yes | No |
| PEN | Peru | Yape / Plin / CCI | Yes | No |
| PHP | Philippines | InstaPay | Yes | Yes |
| KES | Kenya | M-Pesa (phone / till) | Yes | No |
| EUR | Revolut EUR | Revolut | Yes | No |
| USD | Revolut USD | Revolut | Yes | No |

`isAlpha: true` — feature-flagged, may not be fully available in production.
`disabled: true` — hidden from selection in the UI.
`uploadPaymentQR: true` — merchant/seller uploads a QR image as the payment address (PEN Yape/Plin, VEN Pago Móvil, BOB QR Simple). Omit or leave unset for everyone else. Distinct from `disabledPaymentTypes: ["PAY"]`, which gates the buyer scanning a QR to pay.

Scan & pay (PAY) is a different path: `parseQR` stores the scanned blob as the payment ID. The merchant re-encodes that blob with `getPayQrPayload(currency, id)` (strict `getStoredQrPayload` first, then a per-country PAY hook). Do not reuse `uploadPaymentQR` to decide whether a PAY order shows a QR.

`validateQr` — this currency may store a QR in the payment ID (`qr||fields` or standalone). `usesPackedPaymentId(currency)` is true when `validateQr` exists.

`getPayQrPayload` — optional CountryOption hook for PAY **display**. Scan & Pay uses the same `validateQr` as SELL (`parsePeru` CRC, `parsePagoMovil` `merchantId`, `validateBolivianQr` envelope/CRC). The hook may still re-draw a blob already stored (PEN without CRC, VEN without `merchantId`, BOB EMVCo without CRC or a non-24/32 hex envelope, PHP QR Ph vs InstaPay `phone|bank`). Apps must not branch on currency.

`optional: true` — empty value allowed for that field. If every field is optional, at least one must still be filled (`validatePaymentIdFields`). Packed QR + fields are validated with `validateStoredPaymentId`. QR and typed fields may coexist; if any typed field has text, non-optional catalog fields are all required. Forms call `validateCatalogPaymentDraft(currency, qr, fieldValues)` and show `field.validationErrorMessage` on invalid fields. Layout copy (one generic “if they cannot scan, fill the details” hint) stays in the apps — not a per-country catalog hook.

`transferWarning` — optional i18n key shown before the payer sends fiat (bank outage, delayed credits, etc.). Apps call `getTransferWarning(currency)` and translate with `t(key)`. Omit when there is no warning. Currently set on CUP (`CUP_BANDEC_WARNING`).

```typescript
import {
  getStoredQrPayload,
  getPayQrPayload,
  getTransferWarning,
  packStoredPaymentId,
  uploadsPaymentQR,
  usesCatalogPaymentForm,
  usesPackedPaymentId,
  validateCatalogPaymentDraft,
  validateStoredPaymentId,
} from "@p2pdotme/sdk/country";

uploadsPaymentQR("PEN"); // true — seller may upload a Yape/Plin QR
uploadsPaymentQR("VEN"); // true — seller may upload a Pago Móvil QR
uploadsPaymentQR("BOB"); // true — seller may upload a QR Simple QR
usesPackedPaymentId("VEN"); // true — has validateQr
usesCatalogPaymentForm("CUP"); // true — two typed fields, no QR upload
getTransferWarning("CUP"); // "CUP_BANDEC_WARNING"
getTransferWarning("INR"); // null
validateStoredPaymentId("PEN", "987654321"); // true — phone-only
packStoredPaymentId("PEN", qr, { phone: "987654321", cci: "" });
getStoredQrPayload("PEN", storedId); // EMVCo blob or null
getPayQrPayload("PEN", scannedBlob); // same, even if CRC fails
getPayQrPayload("BOB", scannedBlob); // QR Simple EMVCo or encrypted envelope
getPayQrPayload("PHP", qrPhBlob); // QR Ph EMVCo; null for phone|bank
```

## Validators

| Validator | Currency | Accepts |
|-----------|----------|---------|
| `validateUPIId` | INR | `username@bankname` |
| `validateIndonesianPhoneNumber` | IDR | 9–12 digit phone number |
| `validatePIXId` | BRL | CPF, CNPJ, email, phone (10 digits), UUID |
| `validateArgentinePaymentId` | ARS | CBU/CVU (22 digits with checksum) or Alias (6–20 chars) |
| `validateMexicanPaymentId` | MEX | CLABE (18 digits), card (16 digits), phone (10 digits) |
| `validateVenezuelanPhoneNumber` | VEN | 11-digit number starting with `04` |
| `validateVenezuelanRif` | VEN | `V|E|J|G|R|P` prefix + digits (Cédula/RIF / passport) |
| `validateBolivianAccount` | BOB | 8–20 digit bank account number (spaces/dashes allowed) |
| `validateBolivianQr` | BOB | QR Simple EMVCo QR (country `BO`, currency `068`, valid CRC) |
| `validateNigerianAccountNumber` | NGN | Exactly 10 digits (NUBAN) |
| `validateColombianPaymentId` | COP | 10-digit phone starting with `3`, or email |
| `validateCubanPhoneNumber` | CUP | 8-digit phone (optional `+53` prefix) |
| `validateCubanCardNumber` | CUP | 16-digit bank card (spaces/dashes allowed) |
| `validateEcuadorianCedula` | ECU | 10-digit cédula (módulo-10) or 13-digit RUC |
| `validatePeruvianPhone` | PEN | Yape/Plin phone (`9XXXXXXXX`, optional `+51`) |
| `validatePeruvianCci` | PEN | 20-digit CCI |
| `validatePeruvianPaymentKey` | PEN | CCI **or** Yape/Plin phone (legacy single-field) |
| `validatePeruvianQr` | PEN | Yape/Plin EMVCo QR (country `PE`, currency `604`, valid CRC). Source: `qr-validator.ts`. |
| `validateVenezuelanQr` | VEN | Pago Móvil S7B envelope (`base64?merchantId=`). Source: `qr-validator.ts`. |
| `validatePhilippinePhoneNumber` | PHP | Mobile number `9XXXXXXXXX` (optional `0` or `+63` prefix) |
| `validateKenyanPaymentId` | KES | M-Pesa phone (`07XX`/`01XX`/`254…`) **or** Buy Goods till number (5–7 digits) |
| `validateRevolutId` | EUR/USD | Username, email, or phone |

### Compound payment IDs

Venezuela (VEN) requires three fields when the typed path is used: phone, RIF, and bank name. QR-only is also valid. Peru (PEN) has two **optional** fields (Yape/Plin phone and CCI); at least one must be present if there is typed text.

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
2. If sellers upload a QR, add the payload check to `qr-validator.ts` and set `validateQr` / `uploadPaymentQR` on the country option.
3. Add `export * from "./<code>"` to `currencies/index.ts`
4. Add the country option to `countries.ts`
5. Add the payment fields to `payment-fields.ts`
6. Add validator tests to `test/country/validators.test.ts`
