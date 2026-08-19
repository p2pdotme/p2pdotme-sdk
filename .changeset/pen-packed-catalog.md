---
"@p2pdotme/sdk": minor
---

country: catalog flags and generic packed payment-ID helpers

- `uploadPaymentQR?` (default false) and `validateQr?` on `CountryOption`, plus `uploadsPaymentQR()`, `usesPackedPaymentId()` (derived from `validateQr`), and `getCountryOption()`.
- PEN payment fields are optional `phone` + `cci` (at least one required). Stored IDs may be `qr||field|field`.
- Catalog helpers: `packStoredPaymentId`, `getStoredQrPayload`, `validateStoredPaymentId`, `unpackPackedPaymentId`, `assignStoredPaymentIdToFieldValues`, `formatStoredPaymentIdForDisplay`.
- PEN phone embedded in a Yape/Plin QR is hydrated via `CountryOption.hydrateFieldsFromQr` — no `currency === "PEN"` in the generic layer.
