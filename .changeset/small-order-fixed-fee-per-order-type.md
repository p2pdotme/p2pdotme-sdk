---
"@p2pdotme/sdk": minor
---

Fix small-order fixed fee to be per order type. The Diamond exposes the fixed fee via three per-order-type getters (`getSmallOrderFixedFeeBuy` / `Sell` / `Pay`), but the SDK only read a single non-existent `getSmallOrderFixedFee(currency)`. `getFeeConfig({ currency })` now reads all three and returns `smallOrderFixedFee` as `{ buy, sell, pay }` (the per-currency `smallOrderThreshold` is unchanged).
