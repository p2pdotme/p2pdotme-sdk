import type { RelayIdentity } from "./identity";

export interface RelayIdentityStore {
	get(): Promise<RelayIdentity | null>;
	set(identity: RelayIdentity): Promise<void>;
}

/**
 * Thrown by a store's `get()` when the persisted payload is unreadable
 * (e.g. malformed JSON). Recognised by `resolveRelayIdentity` and remapped
 * to `RELAY_IDENTITY_CORRUPT` so callers can distinguish a corrupt entry
 * from a transient store failure.
 */
export class RelayIdentityCorruptError extends Error {
	constructor(cause?: unknown) {
		super("Stored relay identity is corrupt", { cause });
		this.name = "RelayIdentityCorruptError";
	}
}

/**
 * Ephemeral in-process store. Lost on process restart. Used as the default
 * when the consumer doesn't supply one.
 */
export function createInMemoryRelayStore(): RelayIdentityStore {
	let value: RelayIdentity | null = null;
	return {
		async get() {
			return value;
		},
		async set(identity) {
			value = identity;
		},
	};
}

const DEFAULT_KEY = "@P2PME:RELAY_IDENTITY";

/**
 * Browser-only adapter that persists the identity as JSON in `localStorage`.
 * Throws at call time if `localStorage` is unavailable — do not use in SSR/RN.
 */
export function createLocalStorageRelayStore(options: { key?: string } = {}): RelayIdentityStore {
	const key = options.key ?? DEFAULT_KEY;
	return {
		async get() {
			const raw = localStorage.getItem(key);
			if (!raw) return null;
			try {
				return JSON.parse(raw) as RelayIdentity;
			} catch (cause) {
				throw new RelayIdentityCorruptError(cause);
			}
		},
		async set(identity) {
			localStorage.setItem(key, JSON.stringify(identity));
		},
	};
}
