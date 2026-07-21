---
"@p2pdotme/sdk": minor
---

Add `@p2pdotme/sdk/payment-proof` — a `ResultAsync` client for the encrypted-payment-proof server. Lets integrators surface a proof pill (`getOrderProofRequest`), raise a request (`requestProof`), read feature config (`getPublicConfig`), and list/download proof files for completed SELL/PAY orders. Wraps the published `p2pme-encrypted-payment-proof` client and follows the SDK's factory + no-throw conventions.
