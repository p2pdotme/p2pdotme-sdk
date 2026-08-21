---
"@p2pdotme/sdk": minor
---

country: QR and typed payment fields may coexist

- `packStoredPaymentId` keeps a typed rest whenever any field has text, so a partial draft cannot hide behind a valid QR.
- `validateStoredPaymentId` / `validateCatalogPaymentDraft(currency, qr, fieldValues)`: QR-only, typed-only, or both; if any typed field is filled, catalog `optional` rules apply. Apps validate the form with this; field errors come from `PAYMENT_ID_FIELDS[].validationErrorMessage`.
- `validateVenezuelanPaymentId` / `validatePeruvianPaymentId` reject a packed ID whose rest is present but invalid.
