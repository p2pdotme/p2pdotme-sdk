---
"@p2pdotme/sdk": minor
---

country: `getPayQrPayload` for PAY QR display; Scan & Pay uses SELL `validateQr`

- Optional `CountryOption.getPayQrPayload` plus dispatcher `getPayQrPayload(currency, id)` (strict `getStoredQrPayload` first, then the hook). Apps re-draw scanned QRs without branching on PEN/VEN/PHP.
- PAY display may be looser than upload (Yape/Plin without CRC, Pago Móvil without `merchantId`, PHP QR Ph vs InstaPay `phone|bank`). `assignStoredPaymentIdToFieldValues` no longer dumps a standalone PAY blob into typed fields.
- Scan & Pay parsers align with SELL: `parsePeru` requires CRC (`validatePeruvianQr`); `parsePagoMovil` / `isPagoMovilQr` require the S7B envelope (`validateVenezuelanQr`). `parseQR` re-checks `validateQr` when the country has one.
