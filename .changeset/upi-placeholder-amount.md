---
"@p2pdotme/sdk": patch
---

qr-parsers: treat placeholder `am=undefined` / `am=null` in UPI QRs as "no amount"

Some QR generators serialise JS `undefined`/`null` straight into the `am=` query
param when no amount was set. UPI apps treat such a QR as "payer enters amount";
`parseUPI` now does the same instead of rejecting the QR with an invalid-amount error.
