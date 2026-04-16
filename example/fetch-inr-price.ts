/**
 * Fetch and print the buy/sell price config for INR.
 *
 *   bun run example/fetch-inr-price.ts
 *
 * Edit the CONFIG block below before running.
 */

import { createPublicClient, formatUnits, http } from "viem";
import { baseSepolia } from "viem/chains";
import { createPrices } from "@p2pdotme/sdk/prices";

// ── CONFIG (edit these) ─────────────────────────────────────────────────
const RPC_URL = "https://sepolia.base.org";
const CHAIN = baseSepolia;
const DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
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
	const prices = createPrices({ publicClient, diamondAddress: DIAMOND_ADDRESS });

	step(1, "Configuration");
	kv("Chain", `${CHAIN.name} (${CHAIN.id})`);
	kv("Diamond", DIAMOND_ADDRESS);
	kv("Currency", CURRENCY);

	// ── 2. Fetch the price config ─────────────────────────────────────
	step(2, `Price config — ${CURRENCY}`);
	const res = await prices.getPriceConfig({ currency: CURRENCY });
	if (res.isErr()) {
		console.error(`   ✖ ${res.error.code}: ${res.error.message}`);
		process.exit(1);
	}
	const pc = res.value;
	kv("buyPrice", `${formatUnits(pc.buyPrice, 6)} (${pc.buyPrice})`);
	kv("sellPrice", `${formatUnits(pc.sellPrice, 6)} (${pc.sellPrice})`);
	kv("buyPriceOffset", pc.buyPriceOffset.toString());
	kv("baseSpread", pc.baseSpread.toString());
	console.log();
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
