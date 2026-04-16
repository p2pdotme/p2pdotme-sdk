// ── Version ──────────────────────────────────────────────────────────────

declare const __SDK_VERSION__: string;
export const VERSION: string = __SDK_VERSION__;

// ── Shared types ─────────────────────────────────────────────────────────

export type { CurrencyCode, PublicClientLike } from "./types";

// ── Shared errors ────────────────────────────────────────────────────────

export { SdkError } from "./validation";
