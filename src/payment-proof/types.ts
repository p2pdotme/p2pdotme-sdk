import type {
	ProofFileDto,
	ProofRequestDto,
	PublicConfigDto,
	SessionStorageLike,
} from "p2pme-encrypted-payment-proof";
import type { Address } from "viem";

// ── Re-exported wire DTOs (for consumer typing) ─────────────────────────

export type { ProofFileDto, ProofRequestDto, PublicConfigDto, SessionStorageLike };

// ── Client config ───────────────────────────────────────────────────────

export interface PaymentProofConfig {
	/** Base URL of the encrypted-payment-proof server (e.g. `https://proof.p2p.me`). */
	readonly apiUrl: string;
	/**
	 * On-chain identity to claim — the smart-account address for the user/merchant
	 * apps, the EOA for ops. The server's role checks are evaluated against it.
	 */
	readonly address: Address;
	/** EIP-155 chain id the wallet is on (must match the server's `CHAIN_ID`). */
	readonly chainId: number;
	/**
	 * EIP-191 `personal_sign` of the sign-in message. Called at most once per session
	 * — the minted bearer token is reused until it nears expiry.
	 */
	readonly signMessage: (message: string) => Promise<string>;
	/**
	 * Optional bearer-token persistence (e.g. `sessionStorage`) so a session survives
	 * a page reload. In-memory only when omitted.
	 */
	readonly storage?: SessionStorageLike;
	/** Override for tests / non-browser runtimes. */
	readonly fetch?: typeof fetch;
}
