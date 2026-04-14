import { useEffect, useState } from "react";
import { getFingerprint, loadFingerprintAgent } from "../fingerprint";

interface UseFingerprintResult {
	data: { visitorId: string; confidence: number } | null;
	error: Error | null;
	isLoading: boolean;
}

export function useFingerprint(enabled: boolean): UseFingerprintResult {
	const [data, setData] = useState<{
		visitorId: string;
		confidence: number;
	} | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!enabled) return;

		let cancelled = false;
		setIsLoading(true);

		(async () => {
			try {
				await loadFingerprintAgent();
				const result = await getFingerprint(5000);
				if (!cancelled) {
					setData(result);
					setError(null);
				}
			} catch (e) {
				if (!cancelled) {
					setError(e instanceof Error ? e : new Error(String(e)));
					setData(null);
				}
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [enabled]);

	return { data, error, isLoading };
}
