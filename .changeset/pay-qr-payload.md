---
"@p2pdotme/sdk": minor
---

country: `getPayQrPayload` for PAY QR display; Scan & Pay uses SELL `validateQr`

- Optional `CountryOption.getPayQrPayload` plus dispatcher `getPayQrPayload(currency, id)` (strict `getStoredQrPayload` first, then the hook). Apps re-draw scanned QRs without branching on PEN/VEN/BOB/PHP.
- PAY display may be looser than upload (Yape/Plin without CRC, Pago Móvil without `merchantId`, BOB EMVCo without CRC or a non-24/32 hex envelope, PHP QR Ph vs InstaPay `phone|bank`). `assignStoredPaymentIdToFieldValues` no longer dumps a standalone PAY blob into typed fields.
- Scan & Pay parsers align with SELL: `parsePeru` requires CRC (`validatePeruvianQr`); `parsePagoMovil` / `isPagoMovilQr` require the S7B envelope (`validateVenezuelanQr`); BOB uses `validateBolivianQr`. `parseQR` re-checks `validateQr` when the country has one.
