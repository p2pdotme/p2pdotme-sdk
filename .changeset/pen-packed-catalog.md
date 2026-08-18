---
"@p2pdotme/sdk": minor
---

country: catalog flags and helpers for packed PEN payment IDs

- `uploadPaymentQR` / `packedPaymentId` on `CountryOption`, plus `uploadsPaymentQR()` and `usesPackedPaymentId()`.
- PEN payment fields are optional `phone` + `cci` (at least one required). Stored IDs may be `qr||phone|cci`.
- New helpers: `validateStoredPaymentId`, `unpackPackedPaymentId`, `assignStoredPaymentIdToFieldValues`, `formatStoredPaymentIdForDisplay`, `parsePeruvianPaymentId` / `serializePeruvianPaymentId`.
- Parse assigns CCI and phone by validator (any order) and extracts a Yape/Plin phone from the EMVCo QR when present.
