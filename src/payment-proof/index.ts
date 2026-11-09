// ── Main entry point ────────────────────────────────────────────────────

export { createPaymentProof, type PaymentProof } from "./client";

// ── Types ───────────────────────────────────────────────────────────────

export type { ProofStatus } from "p2pme-encrypted-payment-proof";
export type {
	PaymentProofConfig,
	ProofFileDto,
	ProofRequestDto,
	PublicConfigDto,
	SessionStorageLike,
} from "./types";
export type {
	OrderProofParams,
	ProofFileParams,
	ProofRequestIdParams,
	RequestProofParams,
} from "./validation";

// ── Errors ──────────────────────────────────────────────────────────────

export { PaymentProofError, type PaymentProofErrorCode } from "./errors";
