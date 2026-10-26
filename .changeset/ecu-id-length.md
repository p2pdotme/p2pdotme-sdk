---
"@p2pdotme/sdk": patch
---

country: accept 9–13 digit Ecuadorian identification numbers

`validateEcuadorianCedula` previously required exactly 10 digits (cédula with
módulo-10 checksum) or 13 digits (RUC). Foreign nationals in Ecuador hold 9-digit
IDs, so the field now accepts any 9–13 digit value and no longer enforces a checksum.
