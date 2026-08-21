---
"@p2pdotme/sdk": minor
---

country: optional transfer warning key on CountryOption

- `transferWarning?` on `CountryOption` holds an i18n key shown before the payer sends fiat.
- `getTransferWarning(currency)` reads it (same pattern as `uploadsPaymentQR`). Apps must not branch on currency.
- CUP sets `CUP_BANDEC_WARNING` (BANDEC delays / disputes). Translations live in the apps.
