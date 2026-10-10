---
"@p2pdotme/sdk": patch
---

country: disable Egypt (EGP)

`EGP_COUNTRY_OPTION.disabled` is now `true`, so apps that filter on `disabled` stop offering Egypt for selection — the same switch Mexico (MEX) and Revolut EUR use. Every EGP export, validator and payment-field config is unchanged, so this is not a breaking change.
