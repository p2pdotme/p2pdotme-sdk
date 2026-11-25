---
"@p2pdotme/sdk": patch
---

country: accept Bre-B keys tied to Colombian identity documents

`validateColombianPaymentId` only accepted phones starting with `3`, emails and
`@` aliases, so users whose Bre-B key is their identity document number could
not place an order. It now also accepts 6–10 digit keys starting with `0` or `1`.
