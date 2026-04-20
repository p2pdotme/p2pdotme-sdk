import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createInMemoryRelayStore,
	createLocalStorageRelayStore,
	createRelayIdentity,
} from "../../src/orders/relay-identity";

describe("createInMemoryRelayStore", () => {
	it("returns null before any set", async () => {
		const store = createInMemoryRelayStore();
		expect(await store.get()).toBeNull();
	});

	it("round-trips an identity", async () => {
		const store = createInMemoryRelayStore();
		const identity = createRelayIdentity();
		await store.set(identity);
		expect(await store.get()).toEqual(identity);
	});
});

describe("createLocalStorageRelayStore", () => {
	const storage = new Map<string, string>();

	beforeEach(() => {
		storage.clear();
		vi.stubGlobal("localStorage", {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => {
				storage.set(k, v);
			},
			removeItem: (k: string) => {
				storage.delete(k);
			},
		});
	});

	it("uses the default key when none is provided", async () => {
		const store = createLocalStorageRelayStore();
		const identity = createRelayIdentity();
		await store.set(identity);
		expect(storage.has("@P2PME:RELAY_IDENTITY")).toBe(true);
		expect(await store.get()).toEqual(identity);
	});

	it("respects a custom key", async () => {
		const store = createLocalStorageRelayStore({ key: "custom" });
		const identity = createRelayIdentity();
		await store.set(identity);
		expect(storage.has("custom")).toBe(true);
		expect(storage.has("@P2PME:RELAY_IDENTITY")).toBe(false);
	});

	it("returns null when nothing is stored", async () => {
		const store = createLocalStorageRelayStore();
		expect(await store.get()).toBeNull();
	});

	it("throws RelayIdentityCorruptError when the payload is not valid JSON", async () => {
		storage.set("@P2PME:RELAY_IDENTITY", '{"pubkey":"abc",');
		const store = createLocalStorageRelayStore();
		await expect(store.get()).rejects.toMatchObject({
			name: "RelayIdentityCorruptError",
		});
	});
});
