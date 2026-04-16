/**
 * BUY order — linear walkthrough.
 *
 *   bun run example/make-buy-order.ts
 *
 * The BUY user journey:
 *   1. (INR only) Run a fraud pre-check via the fraud engine. If the backend
 *      rejects, abort without touching the chain.
 *   2. Place the order on-chain. USDC is reserved for you; no approval needed.
 *   3. (INR only) Link the fraud activity log to the on-chain orderId.
 *   4. Wait for a merchant to accept.
 *   5. Send the fiat off-chain (UPI, PIX, bank transfer, …). Confirm when done.
 *   6. The merchant marks the order completed on-chain → you receive USDC.
 *
 * Edit the CONFIG block below before running. Use a funded account — this
 * targets Base mainnet.
 *
 * ⚠ The fraud engine is designed for browsers — it collects device
 * fingerprints + SEON session signals from `window` / `navigator`. In a Node
 * or bun CLI the browser-only APIs are guarded for SSR, so the fraud check
 * will run with empty device signals and your backend will likely reject or
 * degrade. The code below shows the correct integration pattern; to exercise
 * it fully, wire the same calls into a browser app.
 */

import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { createOrders } from "@p2pdotme/sdk/orders";
import type { Order, OrderStatus, OrdersClient } from "@p2pdotme/sdk/orders";
import { createFraudEngine } from "@p2pdotme/sdk/fraud-engine";
import type { FraudEngineSigner } from "@p2pdotme/sdk/fraud-engine";

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
const FIAT_AMOUNT_LIMIT = 0n; // 0 = no slippage check
const POLL_INTERVAL_MS = 2000;

// Fraud engine — required for INR buy orders. Fill in or disable by setting
// FRAUD_ENGINE_API_URL to an empty string (the script will then skip the
// fraud check, which is wrong for production INR flows).
const FRAUD_ENGINE_API_URL = "";
const FRAUD_ENGINE_ENCRYPTION_KEY = "";
const FRAUD_ENGINE_SEON_REGION: string | undefined = undefined; // e.g. "asia"
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

	// INR buy orders require a fraud pre-check. Skip for other currencies, and
	// skip (with a warning) if the fraud engine isn't configured.
	const requiresFraudCheck = CURRENCY === "INR";
	const fraudEngine =
		requiresFraudCheck && FRAUD_ENGINE_API_URL && FRAUD_ENGINE_ENCRYPTION_KEY
			? createFraudEngine({
					apiUrl: FRAUD_ENGINE_API_URL,
					encryptionKey: FRAUD_ENGINE_ENCRYPTION_KEY,
					seonRegion: FRAUD_ENGINE_SEON_REGION,
				})
			: null;

	if (fraudEngine) await fraudEngine.init();

	step(1, "Configuration");
	kv("Chain", `${CHAIN.name} (${CHAIN.id})`);
	kv("Account", account.address);
	kv("Currency", CURRENCY);
	kv("USDC amount", USDC_AMOUNT.toString());
	kv("Fiat amount", FIAT_AMOUNT.toString());
	kv("Fraud engine", fraudEngine ? "configured" : "disabled");

	if (requiresFraudCheck && !fraudEngine) {
		console.log(
			"   ⚠ INR buy orders require the fraud engine. Set FRAUD_ENGINE_API_URL +\n" +
				"   FRAUD_ENGINE_ENCRYPTION_KEY to run the pre-check. Continuing without it\n" +
				"   for demo purposes — do NOT do this in production.",
		);
	}

	// ── 2. Fraud pre-check (INR only) ─────────────────────────────────
	// We keep the activity log id around so we can link it to the on-chain
	// orderId after the tx lands (step 4).
	let linkFraudLog: ((orderId: string) => ReturnType<NonNullable<typeof fraudEngine>["logFingerprint"]>) | null =
		null;

	if (fraudEngine) {
		step(2, "Fraud pre-check");

		const signer: FraudEngineSigner = {
			address: account.address,
			signMessage: (message) => account.signMessage({ message }),
		};

		const check = await fraudEngine.checkBuyOrder({
			signer,
			orderDetails: {
				cryptoAmount: Number(USDC_AMOUNT) / 1e6,
				fiatAmount: Number(FIAT_AMOUNT) / 1e6,
				currency: CURRENCY,
				recipientAddress: account.address,
				fee: 0,
				amountAfterFee: Number(USDC_AMOUNT) / 1e6,
			},
			userDetails: {
				currency: CURRENCY,
				country: "IN",
			},
			orderSource: "example/make-buy-order.ts",
		});

		if (check.isErr()) {
			console.error(`   ✖ fraud check failed (${check.error.code}): ${check.error.message}`);
			process.exit(1);
		}
		if (!check.value.approved) {
			console.error(`   ✖ fraud check rejected: ${check.value.message}`);
			process.exit(1);
		}

		kv("approved", "yes");
		kv("activity log id", check.value.activityLogId);
		linkFraudLog = check.value.linkOrder;
	}

	// ── 3. Place the order ────────────────────────────────────────────
	step(fraudEngine ? 3 : 2, "Place BUY order");
	const place = await orders.placeOrder.execute({
		walletClient,
		waitForReceipt: true,
		orderType: 0, // BUY
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
	kv("tx hash", place.value.hash);
	kv("orderId", orderId.toString());
	kv("circleId", place.value.meta?.circleId?.toString() ?? "—");

	// ── 4. Link fraud log → orderId (INR only) ────────────────────────
	if (linkFraudLog) {
		step(4, "Link fraud activity log to orderId");
		const link = await linkFraudLog(orderId.toString());
		if (link.isErr()) {
			// Linking is best-effort — don't block the user on it.
			console.error(`   ⚠ link failed (${link.error.code}): ${link.error.message}`);
		} else {
			kv("linked", "yes");
		}
	}

	// ── 5. Wait for merchant to accept ────────────────────────────────
	step(fraudEngine ? 5 : 3, "Wait for merchant acceptance");
	const accepted = await waitForStatus(orders, orderId, "accepted");
	console.log();
	kv("Merchant", accepted.acceptedMerchant);
	kv("Accepted at", new Date(Number(accepted.acceptedAt) * 1000).toISOString());

	// ── 6. Pay off-chain ──────────────────────────────────────────────
	step(fraudEngine ? 6 : 4, "Send fiat off-chain");
	console.log("   A merchant has accepted your order. Transfer the fiat");
	console.log("   amount to them using the agreed payment rail (UPI, PIX, …).");
	await pressEnterToContinue("Press Enter once you've completed the payment…");

	// ── 7. Wait for merchant to complete ──────────────────────────────
	step(fraudEngine ? 7 : 5, "Wait for merchant to release USDC");
	const final = await waitForStatus(orders, orderId, "completed");

	// ── 8. Done ───────────────────────────────────────────────────────
	step(fraudEngine ? 8 : 6, "Done");
	kv("Final status", final.status);
	kv("USDC received", final.actualUsdcAmount.toString());
	kv("Fiat sent", final.actualFiatAmount.toString());
	kv("Fee paid", final.fixedFeePaid.toString());
	console.log();
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
