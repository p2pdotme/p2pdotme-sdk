---
"@p2pdotme/sdk": patch
---

qr-parsers: fix two correctness bugs in EMVCo QR parsing

- `verifyCRC16` located the CRC tag with `lastIndexOf("6304")`, which matched the
  CRC *value* instead of the tag whenever a valid QR's checksum was exactly
  `6304` (payload ending `...63046304`), falsely rejecting the code. The tag is
  now located positionally at `length - 8`. Affects PIX, MercadoPago, NGN and QRPh.
- `parseAmount` used `parseFloat`, which silently accepted a valid numeric prefix
  with trailing garbage (`"12abc"` → `12`), plus `"Infinity"` and exponent forms.
  It also never validated `sellPrice`, so a `0` or negative price produced an
  `Infinity`/negative `usdc`. It now requires a whole-string finite positive
  decimal and a finite positive `sellPrice`, returning `null` otherwise.

Added dedicated unit tests for both utilities, including regression cases.
