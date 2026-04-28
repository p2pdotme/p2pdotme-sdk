const STORAGE_KEY = "@P2PME:DEVICE_HASH";

const UUID_RE = /^[0-9a-f-]{36}$/;

let cached: string | null = null;

/**
 * Returns a stable per-localStorage identifier, creating one on first call.
 * Returns null when localStorage or crypto is unavailable.
 */
export function getOrCreateDeviceHash(): string | null {
	if (cached) return cached;
	if (typeof localStorage === "undefined" || typeof crypto === "undefined") {
		return null;
	}
	try {
		const existing = localStorage.getItem(STORAGE_KEY);
		if (existing && UUID_RE.test(existing)) {
			cached = existing;
			return existing;
		}
		const fresh = crypto.randomUUID();
		localStorage.setItem(STORAGE_KEY, fresh);
		cached = fresh;
		return fresh;
	} catch {
		return null;
	}
}
