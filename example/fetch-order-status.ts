/**
 * Fetch and print a single order's current state.
 *
 *   bun run example/fetch-order-status.ts
 *
 * Edit the CONFIG block below before running. No wallet / private key needed —
 * reads only.
 */

import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { createOrders } from "@p2pdotme/sdk/orders";

// ── CONFIG (edit these) ─────────────────────────────────────────────────
const RPC_URL = "https://mainnet.base.org";
const CHAIN = base;
const DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const USDC_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const SUBGRAPH_URL = "https://example.com/subgraph";
const ORDER_ID = 1n;
// ────────────────────────────────────────────────────────────────────────

// Tiny logging helpers
const step = (n: number, title: string) =>
	console.log(`\n── ${n}. ${title} ${"─".repeat(Math.max(0, 60 - title.length - 4))}`);
const kv = (key: string, value: unknown) =>
	console.log(`   ${key.padEnd(20)} ${String(value)}`);

function isoOrDash(unixSeconds: bigint): string {
	return unixSeconds === 0n ? "—" : new Date(Number(unixSeconds) * 1000).toISOString();
}

async function main(): Promise<void> {
	// ── 1. Setup ──────────────────────────────────────────────────────
	const publicClient = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });

	const orders = createOrders({
		publicClient,
		diamondAddress: DIAMOND_ADDRESS,
		usdcAddress: USDC_ADDRESS,
		subgraphUrl: SUBGRAPH_URL,
	});

	step(1, "Configuration");
	kv("Chain", `${CHAIN.name} (${CHAIN.id})`);
	kv("Diamond", DIAMOND_ADDRESS);
	kv("orderId", ORDER_ID.toString());

	// ── 2. Fetch the order ────────────────────────────────────────────
	step(2, "Fetch order");
	const res = await orders.getOrder({ orderId: ORDER_ID });
	if (res.isErr()) {
		console.error(`   ✖ ${res.error.code}: ${res.error.message}`);
		process.exit(1);
	}
	const order = res.value;

	// ── 3. Print the state ────────────────────────────────────────────
	step(3, "Order");
	kv("status", order.status);
	kv("type", order.type);
	kv("dispute status", order.disputeStatus);
	kv("currency", order.currency);

	step(4, "Parties");
	kv("user", order.user);
	kv("recipient", order.recipient);
	kv("accepted merchant", order.acceptedMerchant);
	kv("circleId", order.circleId.toString());

	step(5, "Amounts (6-decimal)");
	kv("usdc (placed)", order.usdcAmount.toString());
	kv("fiat (placed)", order.fiatAmount.toString());
	kv("usdc (actual)", order.actualUsdcAmount.toString());
	kv("fiat (actual)", order.actualFiatAmount.toString());
	kv("fee paid", order.fixedFeePaid.toString());
	kv("tips paid", order.tipsPaid.toString());

	step(6, "Timestamps");
	kv("placed at", isoOrDash(order.placedAt));
	kv("accepted at", isoOrDash(order.acceptedAt));
	kv("paid at", isoOrDash(order.paidAt));
	kv("completed at", isoOrDash(order.completedAt));
	console.log();
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
