import seon from "@seontechnologies/seon-javascript-sdk";

let initialized = false;

export function initSeon(): void {
	if (initialized) return;
	seon.init();
	initialized = true;
}

export async function getSeonSession(region: string): Promise<string | undefined> {
	try {
		return await seon.getSession({
			geolocation: { canPrompt: false },
			networkTimeoutMs: 2000,
			fieldTimeoutMs: 2000,
			region,
			silentMode: true,
		});
	} catch {
		return undefined;
	}
}

export function cleanupSeonStorage(): void {
	if (typeof localStorage === "undefined") return;
	const keysToRemove: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith("seon_session_sent_")) keysToRemove.push(key);
	}
	for (const key of keysToRemove) localStorage.removeItem(key);
}
