import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { OrdersError } from "../errors";
import { createRelayIdentity, type RelayIdentity, ZodRelayIdentitySchema } from "./identity";
import type { RelayIdentityStore } from "./stores";

export interface ResolveRelayIdentityInput {
	readonly relayIdentity?: RelayIdentity;
	readonly store: RelayIdentityStore;
}

/**
 * Resolves a relay identity using the order: `config.relayIdentity` → `store.get()`
 * → generate and persist via `store.set()`. Surfaces `RELAY_IDENTITY_CORRUPT` when
 * the stored value fails validation (no silent regeneration) and
 * `RELAY_IDENTITY_STORE_FAILED` when the store throws.
 */
export function resolveRelayIdentity(
	input: ResolveRelayIdentityInput,
): ResultAsync<RelayIdentity, OrdersError> {
	if (input.relayIdentity) {
		return okAsync(input.relayIdentity);
	}

	return ResultAsync.fromPromise(
		input.store.get(),
		(cause) =>
			new OrdersError("Relay identity store.get failed", {
				code: "RELAY_IDENTITY_STORE_FAILED",
				cause,
			}),
	).andThen((stored) => {
		if (stored !== null) {
			const parsed = ZodRelayIdentitySchema.safeParse(stored);
			if (!parsed.success) {
				return errAsync(
					new OrdersError("Stored relay identity failed validation", {
						code: "RELAY_IDENTITY_CORRUPT",
						cause: parsed.error,
					}),
				);
			}
			return okAsync(stored as RelayIdentity);
		}

		const fresh = createRelayIdentity();
		return ResultAsync.fromPromise(
			input.store.set(fresh),
			(cause) =>
				new OrdersError("Relay identity store.set failed", {
					code: "RELAY_IDENTITY_STORE_FAILED",
					cause,
				}),
		).map(() => fresh);
	});
}
