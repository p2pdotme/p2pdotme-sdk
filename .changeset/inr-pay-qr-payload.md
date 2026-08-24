---
"@p2pdotme/sdk": patch
---

country: INR `getPayQrPayload` for UPI Scan & Pay intents

- `isIndianPayQr` treats `upi://pay?pa=…` as a PAY QR. A bare VPA (`user@bank`) stays a typed field (SELL).
- `hydrateFieldsFromQr` fills `upi` from `pa=` so receipts show the VPA, not the URI blob.
