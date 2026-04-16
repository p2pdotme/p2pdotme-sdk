/**
 * Check the on-chain buy/sell transaction limits for a given wallet on a
 * given currency.
 *
 *   bun run example/check-current-limits.ts
 *
 * Reads only — no wallet / private key needed. Edit the CONFIG block below
 * before running.
 */

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { createProfile } from "@p2pdotme/sdk/profile";

// ── CONFIG (edit these) ─────────────────────────────────────────────────
const RPC_URL = "https://sepolia.base.org";
const CHAIN = baseSepolia;
const DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const USDC_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const CURRENCY = "INR";
// ────────────────────────────────────────────────────────────────────────

// Tiny logging helpers
const step = (n: number, title: string) =>
	console.log(`\n── ${n}. ${title} ${"─".repeat(Math.max(0, 60 - title.length - 4))}`);
const kv = (key: string, value: unknown) =>
	console.log(`   ${key.padEnd(18)} ${String(value)}`);

async function main(): Promise<void> {
	// ── 1. Setup ──────────────────────────────────────────────────────
	const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });

	const profile = createProfile({
		publicClient,
		diamondAddress: DIAMOND_ADDRESS,
		usdcAddress: USDC_ADDRESS,
	});

	step(1, "Configuration");
	kv("Chain", `${CHAIN.name} (${CHAIN.id})`);
	kv("Address", ADDRESS);
	kv("Currency", CURRENCY);

	// ── 2. Fetch tx limits ────────────────────────────────────────────
	step(2, "Tx limits");
	const res = await profile.getTxLimits({ address: ADDRESS, currency: CURRENCY });
	if (res.isErr()) {
		console.error(`   ✖ ${res.error.code}: ${res.error.message}`);
		process.exit(1);
	}
	kv("buyLimit", `${res.value.buyLimit} ${CURRENCY}`);
	kv("sellLimit", `${res.value.sellLimit} ${CURRENCY}`);
	console.log();
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
