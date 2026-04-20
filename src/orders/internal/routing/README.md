# routing (internal)

> **Not a public subpath.** This module is an internal implementation detail of `orders/actions/place-order.ts`. It used to be exported as `@p2pdotme/sdk/order-routing` but was folded back into orders once `placeOrder.execute` became the primary entry point. Consumers interact with it transparently via `orders.placeOrder` — there is no public API here.

## What it does

Given an order intent (currency, user, amounts, type, preferred payment channel), it picks a circle to route the order through. Two stages:

1. **Fetch circles** from the subgraph (GraphQL, with retries and a 10s timeout).
2. **Select one** via epsilon-greedy weighting, then validate on-chain eligibility by reading `getAssignableMerchantsFromCircle` from the Diamond. Retries up to 3× if the first selection is ineligible, removing failed circles from the pool.

## Epsilon-greedy selection

- **75% exploit** — pick from active circles only, weighted by raw `circleScore`.
- **25% explore** — pick from all eligible circles with status-aware weights:
  - `active` → `score`
  - `bootstrap` → `min(score, 25)`
  - `paused` → `score × 0.3`

## Files

| File | What |
|------|------|
| `client.ts` | `createOrderRouter({ publicClient, subgraphUrl, contractAddress, logger? })` → `OrderRouter` with a single method: `selectCircle(params)` → `ResultAsync<bigint, OrderRoutingError>`. |
| `routing.ts` | `selectCircleForOrderAsync` — the epsilon-greedy core + eligibility retry loop. |
| `subgraph/` | `getCirclesForRouting` — GraphQL fetch + validation. |
| `validation.ts` | Zod schemas for `SelectCircleParams` + `CheckCircleEligibilityParams`. |
| `types.ts` | `CircleForRouting`, `OrderRouter`, `OrderRoutingConfig`. |
| `errors.ts` | `OrderRoutingError` with codes `NO_ELIGIBLE_CIRCLES` / `SUBGRAPH_ERROR` / `SUBGRAPH_NOT_CONFIGURED` / `VALIDATION_ERROR` / `CONTRACT_READ_ERROR`. These bubble up to `placeOrder` which wraps them as `OrdersError` with code `CIRCLE_SELECTION_FAILED`. |

## If you're touching this code

- The selection strategy is tuned for merchant assignment rates — changing the ε split or status weights affects real routing outcomes. Change with care and run the full test suite (`test/orders/internal/routing/`).
- Subgraph schema drift is the main failure mode. The Zod schema in `validation.ts` is the canonical shape; update it and the GraphQL query together.
- The module re-exports the internal type `OrderRouter` consumed by `actions/place-order.ts`. If its shape changes, update that consumer too.
