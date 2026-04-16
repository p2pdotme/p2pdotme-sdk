import { err, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import { OrdersError } from "../errors";
import { createRelayIdentity, type RelayIdentity, ZodRelayIdentitySchema } from "./identity";
import { RelayIdentityCorruptError, type RelayIdentityStore } from "./stores";

export interface ResolveRelayIdentityInput {
	readonly relayIdentity?: RelayIdentity;
	readonly store: RelayIdentityStore;
}

const pending = new WeakMap<RelayIdentityStore, Promise<Result<RelayIdentity, OrdersError>>>();

async function resolveFromStore(
	store: RelayIdentityStore,
): Promise<Result<RelayIdentity, OrdersError>> {
	let stored: RelayIdentity | null;
	try {
		stored = await store.get();
	} catch (cause) {
		if (cause instanceof RelayIdentityCorruptError) {
			return err(
				new OrdersError("Stored relay identity is corrupt", {
					code: "RELAY_IDENTITY_CORRUPT",
					cause: cause.cause,
				}),
			);
		}
		return err(
			new OrdersError("Relay identity store.get failed", {
				code: "RELAY_IDENTITY_STORE_FAILED",
				cause,
			}),
		);
	}

	if (stored !== null) {
		const parsed = ZodRelayIdentitySchema.safeParse(stored);
		if (!parsed.success) {
			return err(
				new OrdersError("Stored relay identity failed validation", {
					code: "RELAY_IDENTITY_CORRUPT",
					cause: parsed.error,
				}),
			);
		}
		return ok(stored);
	}

	const fresh = createRelayIdentity();
	try {
		await store.set(fresh);
	} catch (cause) {
		return err(
			new OrdersError("Relay identity store.set failed", {
				code: "RELAY_IDENTITY_STORE_FAILED",
				cause,
			}),
		);
	}
	return ok(fresh);
}

/**
 * Resolves a relay identity using the order: `config.relayIdentity` → `store.get()`
 * → generate and persist via `store.set()`. Surfaces `RELAY_IDENTITY_CORRUPT` when
 * the stored value fails validation (no silent regeneration) and
 * `RELAY_IDENTITY_STORE_FAILED` when the store throws. Concurrent calls for the
 * same store share one in-flight resolution so a generate-and-persist race can
 * never overwrite a freshly-minted identity.
 */
export function resolveRelayIdentity(
	input: ResolveRelayIdentityInput,
): ResultAsync<RelayIdentity, OrdersError> {
	if (input.relayIdentity) {
		return okAsync(input.relayIdentity);
	}

	const existing = pending.get(input.store);
	if (existing) {
		return ResultAsync.fromSafePromise(existing).andThen((r) => r);
	}

	const promise = resolveFromStore(input.store).finally(() => {
		pending.delete(input.store);
	});
	pending.set(input.store, promise);
	return ResultAsync.fromSafePromise(promise).andThen((r) => r);
}
