import type { DeviceDetails } from "./types";

interface NavigatorConnection {
	readonly effectiveType?: string;
}

interface NavigatorExtended extends Navigator {
	readonly connection?: NavigatorConnection;
	readonly deviceMemory?: number;
}

export function getBasicDeviceDetails(): Omit<DeviceDetails, "ip" | "seonSession"> {
	const nav = typeof navigator !== "undefined" ? (navigator as NavigatorExtended) : undefined;
	const win = typeof window !== "undefined" ? window : undefined;

	return {
		userAgent: nav?.userAgent ?? "",
		platform: nav?.platform ?? "",
		language: nav?.language ?? "",
		languages: nav ? Array.from(nav.languages) : [],
		screenWidth: win?.screen?.width ?? 0,
		screenHeight: win?.screen?.height ?? 0,
		devicePixelRatio: win?.devicePixelRatio ?? 1,
		timezone: Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone ?? "",
		timezoneOffset: new Date().getTimezoneOffset(),
		cookiesEnabled: nav?.cookieEnabled ?? false,
		doNotTrack: nav?.doNotTrack ?? null,
		online: nav?.onLine ?? true,
		connectionType: nav?.connection?.effectiveType,
		deviceMemory: nav?.deviceMemory,
		hardwareConcurrency: nav?.hardwareConcurrency,
		touchSupport: nav ? "ontouchstart" in window : false,
		maxTouchPoints: nav?.maxTouchPoints ?? 0,
		vendor: nav?.vendor ?? "",
		appVersion: nav?.appVersion ?? "",
		colorDepth: win?.screen?.colorDepth ?? 0,
		pixelDepth: win?.screen?.pixelDepth ?? 0,
	};
}

export async function fetchIpAddress(): Promise<string | undefined> {
	try {
		const response = await fetch("https://api.ipify.org?format=json");
		const data = (await response.json()) as { ip: string };
		return data.ip;
	} catch {
		return undefined;
	}
}

export async function getDeviceDetails(seonSession?: string): Promise<DeviceDetails> {
	const basic = getBasicDeviceDetails();
	const ip = await fetchIpAddress();
	return { ...basic, ip, seonSession };
}
