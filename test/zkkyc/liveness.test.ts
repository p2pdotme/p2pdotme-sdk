import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareSubmitKycAttestation } from "../../src/contracts/reputation-manager/writes";
import { prepareSubmitLivenessAttestation } from "../../src/contracts/reputation-manager/writes";
import { createLivenessFlow, resumeLivenessFlow } from "../../src/zkkyc/orchestrators/liveness";

const RM = "0xEF2E957deF0EA7dAf2D6579f0D3963a5D7A6Bd77" as const;
const WALLET = "0x000000000000000000000000000000000000dEaD" as const;
const NULLIFIER = `0x${"ab".repeat(32)}` as const;
const SIGNATURE = `0x${"cd".repeat(65)}` as const;

const VALID = {
	nullifier: NULLIFIER,
	limit: 20_000_000n,
	expiry: 1_800_000_000n,
	signature: SIGNATURE,
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("prepareSubmitLivenessAttestation", () => {
	it("encodes a call to the reputation manager", () => {
		const result = prepareSubmitLivenessAttestation(RM, VALID);
		expect(result.isOk()).toBe(true);
		const { to, data } = result._unsafeUnwrap();
		expect(to).toBe(RM);
		expect(data.startsWith("0x")).toBe(true);
	});

	it("targets a different function than the KYC attestation", () => {
		// The two attestations have an identical struct, so a copy-paste that
		// reused the KYC selector would encode cleanly and silently award the
		// wrong tier (and check the wrong nullifier set). Pin the selectors apart.
		const liveness = prepareSubmitLivenessAttestation(RM, VALID)._unsafeUnwrap();
		const kyc = prepareSubmitKycAttestation(RM, VALID)._unsafeUnwrap();
		expect(liveness.data.slice(0, 10)).not.toBe(kyc.data.slice(0, 10));
		// ...but the arguments encode identically, so only the selector differs.
		expect(liveness.data.slice(10)).toBe(kyc.data.slice(10));
	});

	it("rejects a nullifier that is not bytes32", () => {
		const result = prepareSubmitLivenessAttestation(RM, { ...VALID, nullifier: "0xdead" });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
	});

	it("rejects a non-hex signature", () => {
		const result = prepareSubmitLivenessAttestation(RM, { ...VALID, signature: "not-hex" });
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("VALIDATION_ERROR");
	});
});

describe("createLivenessFlow", () => {
	it("posts the session without a country and returns the wizard URL", async () => {
		// The liveness service reads no document, so its widget-session schema has
		// no `country` field -- unlike the passport wizard, which requires one.
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ widget_url: "https://liveness.p2p.cool/?h=tok" }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const result = await createLivenessFlow({
			baseUrl: "https://liveness-proxy.p2p.cool",
			walletAddress: WALLET,
			tenant: "p2p-reputation-liveness",
			redirectUrl: "https://app.p2p.me/limits",
			state: "liveness-abc",
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().widgetUrl).toBe("https://liveness.p2p.cool/?h=tok");

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("https://liveness-proxy.p2p.cool/v1/widget/public-sessions");
		const body = JSON.parse((init as RequestInit).body as string);
		expect(body).toEqual({
			wallet_pubkey: WALLET,
			redirect_uri: "https://app.p2p.me/limits",
			tenant: "p2p-reputation-liveness",
			state: "liveness-abc",
		});
		expect("country" in body).toBe(false);
	});

	it("surfaces a non-2xx as LIVENESS_SESSION_FAILED", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				text: async () => "redirect_uri_not_allowlisted",
			}),
		);

		const result = await createLivenessFlow({
			baseUrl: "https://liveness-proxy.p2p.cool",
			walletAddress: WALLET,
			tenant: "p2p-reputation-liveness",
			redirectUrl: "https://evil.example/limits",
		});

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.code).toBe("LIVENESS_SESSION_FAILED");
		expect(error.message).toContain("redirect_uri_not_allowlisted");
	});
});

describe("resumeLivenessFlow", () => {
	it("redeems the code into an on-chain-ready attestation", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				nullifier: NULLIFIER,
				// The proxy serialises these as JSON numbers/strings; both must
				// survive as bigints for the contract encoder.
				limit: 20000000,
				expiry: "1800000000",
				signature: SIGNATURE,
				identity_hash: "abc123",
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		const result = await resumeLivenessFlow({
			baseUrl: "https://liveness-proxy.p2p.cool",
			code: "one-time-code",
		});

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual({
			nullifier: NULLIFIER,
			limit: 20_000_000n,
			expiry: 1_800_000_000n,
			signature: SIGNATURE,
			identityHash: "abc123",
		});

		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe("https://liveness-proxy.p2p.cool/v1/widget/attestation");
	});

	it("surfaces a spent or unknown code as LIVENESS_REDEEM_FAILED", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "unknown_code" }),
		);

		const result = await resumeLivenessFlow({
			baseUrl: "https://liveness-proxy.p2p.cool",
			code: "already-used",
		});

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr().code).toBe("LIVENESS_REDEEM_FAILED");
	});

	it("feeds straight into the contract encoder", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					nullifier: NULLIFIER,
					limit: 20000000,
					expiry: 1800000000,
					signature: SIGNATURE,
				}),
			}),
		);

		const attestation = (
			await resumeLivenessFlow({ baseUrl: "https://liveness-proxy.p2p.cool", code: "c" })
		)._unsafeUnwrap();
		expect(prepareSubmitLivenessAttestation(RM, attestation).isOk()).toBe(true);
	});
});
