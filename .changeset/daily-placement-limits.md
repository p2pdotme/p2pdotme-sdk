---
"@p2pdotme/sdk": minor
---

orders: decode the gross daily placement caps and expose `getPlacementLimits`

contracts-v4 #436 adds a gross daily SELL/PAY placement cap (20, shared with
PAY) alongside the BUY cap that has existed since launch. Both counters are
incremented at placement and never credited back on cancellation, so a
place-and-cancel loop still burns the day's allowance.

- `parseContractError` now decodes `DailySellOrderPlacementLimitExceeded`
  (`0x4688ce73`) and `DailyBuyOrderPlacementLimitExceeded` (`0x917c7aef`). The
  buy selector was already reachable in production and previously fell through
  to a generic revert message.
- Both codes have UI strings that say cancelled orders still count — without
  that, a user who cancels and retries has no way to understand the rejection.
- New `orders.getPlacementLimits({ userAddress })` read, backed by the
  subgraph's `UserDailyPlacements` and `OrderPlacementLimitConfig` entities,
  returning used / limit / remaining for the buy and sell-pay buckets plus the
  UTC reset time. Advisory only — the subgraph lags the chain, so it is for
  warning or disabling a button, not for deciding whether a placement is legal.

A sell/pay cap of `0` is reported as `unlimited` because that is what the
contract does with it; a `0` buy cap stays `enforced`, because there `0` blocks
every buy. An unindexed cap is reported as `unknown` rather than guessed.

- New `usePlacementLimits` hook in `@p2pdotme/sdk/react`, wrapping that read for
  order forms: refetches on address change, on an optional interval, and once
  the UTC day rolls over — without that last one, a form left open overnight
  keeps showing yesterday's exhausted bucket and the user concludes they are
  still blocked.
