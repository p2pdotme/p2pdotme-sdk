import FingerprintJS from "@fingerprintjs/fingerprintjs";

let agent: Awaited<ReturnType<typeof FingerprintJS.load>> | null = null;
let cachedResult: { visitorId: string; confidence: number } | null = null;

export async function loadFingerprintAgent(): Promise<void> {
	if (agent) return;
	agent = await FingerprintJS.load();
}

export async function getFingerprint(
	timeoutMs = 5000,
): Promise<{ visitorId: string; confidence: number } | null> {
	if (cachedResult) return cachedResult;
	if (!agent) {
		try {
			await loadFingerprintAgent();
		} catch {
			return null;
		}
	}
	const loadedAgent = agent;
	if (!loadedAgent) return null;
	try {
		const result = await Promise.race([
			loadedAgent.get(),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("FingerprintJS timed out")), timeoutMs),
			),
		]);
		cachedResult = {
			visitorId: result.visitorId,
			confidence: result.confidence.score,
		};
		return cachedResult;
	} catch {
		return null;
	}
}
