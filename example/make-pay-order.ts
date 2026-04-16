/**
 * PAY order — linear walkthrough.
 *
 *   bun run example/make-pay-order.ts
 *
 * The PAY user journey (you pay someone else in fiat, the merchant fronts it):
 *   1. Approve USDC (auto-approved by the SDK if allowance is short).
 *   2. Place the order on-chain — the contract pulls your USDC into escrow.
 *   3. Wait for a merchant to accept.
 *   4. Send the merchant the ECIES-encrypted payee destination via
 *      setSellOrderUpi.
 *   5. Merchant pays the payee off-chain, then marks the order completed.
 *
 * Edit the CONFIG block below before running. Use a funded account — this
 * targets Base mainnet.
 */

import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { createOrders } from "@p2pdotme/sdk/orders";
import type { Order, OrderStatus, OrdersClient } from "@p2pdotme/sdk/orders";

// ── CONFIG (edit these) ─────────────────────────────────────────────────
const RPC_URL = "https://mainnet.base.org";
const CHAIN = base;
const DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const USDC_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const SUBGRAPH_URL = "https://example.com/subgraph";
const PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000000" as const; // fund this account; runs on mainnet
const CURRENCY = "INR";
const USDC_AMOUNT = parseUnits("1", 6);
const FIAT_AMOUNT = parseUnits("85", 6);
const FIAT_AMOUNT_LIMIT = 0n;
const POLL_INTERVAL_MS = 2000;
/** Merchant's ECIES pubkey (128 hex chars, no 0x04 prefix). Fetch out-of-band. */
const MERCHANT_PUBLIC_KEY =
	"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
/** Payee's plaintext destination to encrypt for the merchant. */
const PAYEE_ADDRESS = "payee@upi";
// ────────────────────────────────────────────────────────────────────────

// Tiny helpers (copy-paste-safe; no external helper file)
const step = (n: number, title: string) =>
	console.log(`\n── ${n}. ${title} ${"─".repeat(Math.max(0, 60 - title.length - 4))}`);
const kv = (key: string, value: unknown) =>
	console.log(`   ${key.padEnd(18)} ${String(value)}`);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function pressEnterToContinue(prompt = "Press Enter to continue…") {
	const rl = createInterface({ input: stdin, output: stdout });
	await rl.question(`\n   ${prompt} `);
	rl.close();
}

/** Polls getOrder every POLL_INTERVAL_MS and prints each status transition. */
async function waitForStatus(
	orders: OrdersClient,
	orderId: bigint,
	target: OrderStatus,
): Promise<Order> {
	let last: OrderStatus | null = null;
	while (true) {
		const res = await orders.getOrder({ orderId });
		if (res.isErr()) {
			console.error(`   getOrder failed (${res.error.code}): ${res.error.message}`);
			await sleep(POLL_INTERVAL_MS);
			continue;
		}
		const order = res.value;
		if (order.status !== last) {
			console.log(`   status: ${last ?? "(initial)"} → ${order.status}`);
			last = order.status;
		}
		if (order.status === target) return order;
		if (order.status === "cancelled") {
			throw new Error(`Order ${orderId} was cancelled while waiting for "${target}"`);
		}
		await sleep(POLL_INTERVAL_MS);
	}
}

async function main(): Promise<void> {
	// ── 1. Setup ──────────────────────────────────────────────────────
	const account = privateKeyToAccount(PRIVATE_KEY);
	const transport = http(RPC_URL);
	const publicClient = createPublicClient({ chain: CHAIN, transport });
	const walletClient = createWalletClient({ chain: CHAIN, transport, account });

	const orders = createOrders({
		publicClient,
		diamondAddress: DIAMOND_ADDRESS,
		usdcAddress: USDC_ADDRESS,
		subgraphUrl: SUBGRAPH_URL,
	});

	step(1, "Configuration");
	kv("Chain", `${CHAIN.name} (${CHAIN.id})`);
	kv("Account", account.address);
	kv("Currency", CURRENCY);
	kv("USDC amount", USDC_AMOUNT.toString());
	kv("Fiat amount", FIAT_AMOUNT.toString());
	kv("Payee address", PAYEE_ADDRESS);

	// ── 2. Place the order (with auto-approve) ────────────────────────
	step(2, "Place PAY order (autoApprove handles USDC allowance if short)");
	const place = await orders.placeOrder.execute({
		walletClient,
		waitForReceipt: true,
		autoApprove: true,
		orderType: 2, // PAY
		currency: CURRENCY,
		user: account.address,
		recipientAddr: account.address,
		amount: USDC_AMOUNT,
		fiatAmount: FIAT_AMOUNT,
		fiatAmountLimit: FIAT_AMOUNT_LIMIT,
	});
	if (place.isErr()) {
		console.error(`   ✖ placeOrder failed (${place.error.code}): ${place.error.message}`);
		process.exit(1);
	}
	const orderId = place.value.meta?.orderId;
	if (orderId === undefined) {
		console.error("   ✖ orderId missing from receipt — aborting");
		process.exit(1);
	}
	if (place.value.meta?.approveTxHash) {
		kv("approve tx", place.value.meta.approveTxHash);
	}
	kv("place tx", place.value.hash);
	kv("orderId", orderId.toString());
	kv("circleId", place.value.meta?.circleId?.toString() ?? "—");

	// ── 3. Wait for merchant to accept ────────────────────────────────
	step(3, "Wait for merchant acceptance");
	const accepted = await waitForStatus(orders, orderId, "accepted");
	console.log();
	kv("Merchant", accepted.acceptedMerchant);
	kv("Accepted at", new Date(Number(accepted.acceptedAt) * 1000).toISOString());

	// ── 4. Send encrypted payee destination ───────────────────────────
	step(4, "Send encrypted payee destination to merchant (setSellOrderUpi)");
	console.log(`   Encrypting "${PAYEE_ADDRESS}" with the merchant's pubkey…`);
	const set = await orders.setSellOrderUpi.execute({
		walletClient,
		waitForReceipt: true,
		orderId,
		paymentAddress: PAYEE_ADDRESS,
		merchantPublicKey: MERCHANT_PUBLIC_KEY,
		updatedAmount: 0n,
	});
	if (set.isErr()) {
		console.error(`   ✖ setSellOrderUpi failed (${set.error.code}): ${set.error.message}`);
		process.exit(1);
	}
	kv("tx hash", set.value.hash);

	// ── 5. Wait for completion ────────────────────────────────────────
	step(5, "Wait for merchant to pay the payee and complete the order");
	console.log("   The merchant pays the payee off-chain, then calls completeOrder.");
	await pressEnterToContinue("Press Enter to start polling for completion…");

	const final = await waitForStatus(orders, orderId, "completed");

	// ── 6. Done ───────────────────────────────────────────────────────
	step(6, "Done");
	kv("Final status", final.status);
	kv("USDC sent", final.actualUsdcAmount.toString());
	kv("Fiat delivered", final.actualFiatAmount.toString());
	kv("Fee paid", final.fixedFeePaid.toString());
	console.log();
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
