---
"@p2pdotme/sdk": patch
---

qr-parsers: verify the EMVCo CRC-16 checksum on QRIS (IDR) and Yape/Plin (PEN)

`parseQRIS` and `parsePeru` extracted the amount and merchant fields from the
EMVCo payload but never validated the mandatory CRC-16 checksum (tag 63) that
every QRIS and Yape/Plin QR carries — unlike their sibling parsers (QR Ph, PIX,
MercadoPago, NGN), which already reject on checksum mismatch. A corrupted scan
or a tampered payload (altered amount or merchant) was therefore accepted as
valid, and the resulting payment data was trusted downstream.

Both parsers now call `verifyCRC16` and return `INVALID_QR` when the checksum is
missing or does not match, bringing them in line with the other EMVCo parsers.
`parseQRIS` also gains the JSDoc required by the repo's commenting rules.

Added regression tests covering valid checksums, a missing CRC tag, and
tampered-payload rejection for both currencies.
