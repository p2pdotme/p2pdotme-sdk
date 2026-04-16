/**
 * Instagram zk-verification via Reclaim — linear walkthrough.
 *
 *   bun run example/zk-verify-instagram.ts
 *
 * The user journey:
 *   1. Start a Reclaim session for Instagram and print the mobile deep link.
 *   2. Scan it with the Reclaim app and complete the verification.
 *   3. Receive the proof back + prepare the on-chain `socialVerify` calldata.
 *   4. Optionally submit the tx.
 *
 * To verify a different platform (linkedin / github / x / facebook), change
 * the PLATFORM constant in the CONFIG block below.
 *
 * Peer dependency: install `@reclaimprotocol/js-sdk` in the repo root
 * (`bun add -d @reclaimprotocol/js-sdk`) before running this script.
 *
 * Edit the CONFIG block below before running. Use a funded account — this
 * targets Base mainnet.
 */

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import {
	createReclaimFlow,
	createZkkyc,
	DEFAULT_RECLAIM_PROVIDER_IDS,
	type SocialPlatform,
	type SocialVerifyParams,
} from "@p2pdotme/sdk/zkkyc";

// ── CONFIG (edit these) ─────────────────────────────────────────────────
const RECLAIM_APP_ID = "";
const RECLAIM_APP_SECRET = "";
const PLATFORM: SocialPlatform = "instagram"; // linkedin | github | x | instagram | facebook

const PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000000" as const; // fund this account; runs on mainnet

/** Set to null to stop after receiving the proof (no prepare + no submit). */
const REPUTATION_MANAGER_ADDRESS: `0x${string}` | null = null;

/** Set to true to also submit the tx. Needs REPUTATION_MANAGER_ADDRESS above. */
const SUBMIT_TX = false;
const RPC_URL = "https://mainnet.base.org";
const CHAIN = base;
// ────────────────────────────────────────────────────────────────────────

// Tiny logging helpers
const step = (n: number, title: string) =>
	console.log(`\n── ${n}. ${title} ${"─".repeat(Math.max(0, 60 - title.length - 4))}`);
const kv = (key: string, value: unknown) =>
	console.log(`   ${key.padEnd(18)} ${String(value)}`);

async function main(): Promise<void> {
	if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
		console.error("Set RECLAIM_APP_ID and RECLAIM_APP_SECRET at the top of the file.");
		process.exit(1);
	}

	// ── 1. Setup ──────────────────────────────────────────────────────
	const walletAddress = privateKeyToAccount(PRIVATE_KEY).address;

	step(1, "Configuration");
	kv("Platform", PLATFORM);
	kv("Wallet", walletAddress);

	// ── 2. Start the Reclaim flow ─────────────────────────────────────
	step(2, "Start Reclaim session and wait for proof");
	const proofResult = await createReclaimFlow(
		{
			appId: RECLAIM_APP_ID,
			appSecret: RECLAIM_APP_SECRET,
			providerIds: DEFAULT_RECLAIM_PROVIDER_IDS,
		},
		{
			platform: PLATFORM,
			walletAddress,
			contextDescription: `example — ${PLATFORM} verification`,
			onStatus: (s) => {
				switch (s.type) {
					case "session_created":
						console.log(`   sessionId: ${s.sessionId}`);
						console.log("   Scan this URL on your phone:");
						console.log(`\n   ${s.requestUrl}\n`);
						break;
					case "polling_started":
						console.log("   Waiting for proof… (Ctrl-C to abort)");
						break;
					case "proof_received":
						console.log("   ✓ proof received");
						break;
					case "proof_transformed":
						console.log("   ✓ proof transformed for on-chain use");
						break;
				}
			},
		},
	);

	if (proofResult.isErr()) {
		console.error(`   ✖ Reclaim flow failed (${proofResult.error.code}): ${proofResult.error.message}`);
		process.exit(1);
	}
	const proof = proofResult.value;

	step(3, "Proof summary");
	kv("_socialName", proof._socialName);
	kv("sessionId", proof.sessionId);
	kv("proofs", proof.proofs.length);

	if (REPUTATION_MANAGER_ADDRESS === null) {
		console.log("\n   REPUTATION_MANAGER_ADDRESS is null — stopping after proof receipt.");
		return;
	}

	// ── 3. Prepare the on-chain calldata ──────────────────────────────
	step(4, "Prepare socialVerify calldata");
	const zkkyc = createZkkyc({ reputationManagerAddress: REPUTATION_MANAGER_ADDRESS });
	const prepared = zkkyc.prepareSocialVerify({
		_socialName: proof._socialName,
		// Reclaim types `owner` as plain string; SDK validates via Zod at runtime.
		proofs: [...proof.proofs] as SocialVerifyParams["proofs"],
	});
	if (prepared.isErr()) {
		console.error(`   ✖ prepareSocialVerify failed (${prepared.error.code}): ${prepared.error.message}`);
		process.exit(1);
	}
	kv("to", prepared.value.to);
	kv("calldata bytes", (prepared.value.data.length - 2) / 2);

	if (!SUBMIT_TX) {
		console.log("\n   SUBMIT_TX=false — stopping before submission.");
		console.log(`   Calldata: ${prepared.value.data}`);
		return;
	}

	// ── 4. Submit ─────────────────────────────────────────────────────
	step(5, "Submit socialVerify on-chain");
	const account = privateKeyToAccount(PRIVATE_KEY);
	const transport = http(RPC_URL);
	const publicClient = createPublicClient({ chain: CHAIN, transport });
	const walletClient = createWalletClient({ chain: CHAIN, transport, account });

	const hash = await walletClient.sendTransaction({
		account,
		chain: CHAIN,
		to: prepared.value.to,
		data: prepared.value.data,
		value: 0n,
	});
	kv("tx hash", hash);

	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	kv("receipt", receipt.status);
	kv("block", receipt.blockNumber.toString());
	console.log();
}

main().catch((err) => {
	console.error("Unexpected error:", err);
	process.exit(1);
});
