import { describe, expect, it, vi } from "vitest";
import { isAddress } from "viem";
import {
	createInMemoryRelayStore,
	createRelayIdentity,
	resolveRelayIdentity,
	ZodRelayIdentitySchema,
} from "../../src/orders/relay-identity";
import { RelayIdentityCorruptError } from "../../src/orders/relay-identity/stores";

describe("createRelayIdentity", () => {
	it("returns a valid keypair with no side effects", () => {
		const identity = createRelayIdentity();
		expect(isAddress(identity.address)).toBe(true);
		expect(identity.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
		expect(identity.publicKey).toMatch(/^[0-9a-f]{128}$/); // 64 bytes hex, no 0x04 prefix
	});

	it("produces unique identities across calls", () => {
		const a = createRelayIdentity();
		const b = createRelayIdentity();
		expect(a.privateKey).not.toEqual(b.privateKey);
	});

	it("identities pass the schema", () => {
		const identity = createRelayIdentity();
		const result = ZodRelayIdentitySchema.safeParse(identity);
		expect(result.success).toBe(true);
	});
});

describe("resolveRelayIdentity", () => {
	it("returns config.relayIdentity verbatim when provided", async () => {
		const identity = createRelayIdentity();
		const store = createInMemoryRelayStore();
		const setSpy = vi.spyOn(store, "set");
		const result = await resolveRelayIdentity({ relayIdentity: identity, store });
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual(identity);
		expect(setSpy).not.toHaveBeenCalled();
	});

	it("returns the stored identity when present", async () => {
		const stored = createRelayIdentity();
		const store = createInMemoryRelayStore();
		await store.set(stored);
		const result = await resolveRelayIdentity({ store });
		expect(result._unsafeUnwrap()).toEqual(stored);
	});

	it("generates + persists when store is empty", async () => {
		const store = createInMemoryRelayStore();
		const result = await resolveRelayIdentity({ store });
		expect(result.isOk()).toBe(true);
		const fromStore = await store.get();
		expect(fromStore).toEqual(result._unsafeUnwrap());
	});

	it("surfaces RELAY_IDENTITY_CORRUPT when stored identity fails schema", async () => {
		const store = {
			get: async () => ({ address: "nope", publicKey: "x", privateKey: "y" }) as never,
			set: async () => {},
		};
		const result = await resolveRelayIdentity({ store });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("RELAY_IDENTITY_CORRUPT");
	});

	it("surfaces RELAY_IDENTITY_STORE_FAILED when get throws", async () => {
		const store = {
			get: async () => {
				throw new Error("boom");
			},
			set: async () => {},
		};
		const result = await resolveRelayIdentity({ store });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("RELAY_IDENTITY_STORE_FAILED");
	});

	it("surfaces RELAY_IDENTITY_STORE_FAILED when set throws", async () => {
		const store = {
			get: async () => null,
			set: async () => {
				throw new Error("cannot write");
			},
		};
		const result = await resolveRelayIdentity({ store });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("RELAY_IDENTITY_STORE_FAILED");
	});

	it("maps RelayIdentityCorruptError from store.get to RELAY_IDENTITY_CORRUPT", async () => {
		const store = {
			get: async () => {
				throw new RelayIdentityCorruptError(new SyntaxError("unexpected end"));
			},
			set: async () => {},
		};
		const result = await resolveRelayIdentity({ store });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("RELAY_IDENTITY_CORRUPT");
	});

	it("deduplicates concurrent resolutions so both callers share one identity", async () => {
		const store = createInMemoryRelayStore();
		const setSpy = vi.spyOn(store, "set");
		const [a, b] = await Promise.all([
			resolveRelayIdentity({ store }),
			resolveRelayIdentity({ store }),
		]);
		expect(a.isOk() && b.isOk()).toBe(true);
		expect(a._unsafeUnwrap()).toEqual(b._unsafeUnwrap());
		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(await store.get()).toEqual(a._unsafeUnwrap());
	});
});
