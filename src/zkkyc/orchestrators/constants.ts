import type { SocialPlatform } from "./types";

/** Default Reclaim provider IDs for each social platform. */
export const DEFAULT_RECLAIM_PROVIDER_IDS: Record<SocialPlatform, string> = {
	linkedin: "6a86edbe-a0fe-420b-8db2-3155220cc949",
	github: "033f0c06-2eb3-48c8-894c-5599c3356d1c",
	x: "aad95818-f726-4a34-be97-8d1f47631b03",
	instagram: "7e5b59a9-56c5-490c-a169-82a443f9b507",
	facebook: "2701510b-c835-4820-84f0-d9e74569656b",
};

/** ZK Passport app store links. */
export const ZK_PASSPORT_APP_LINKS = {
	IOS: "https://apps.apple.com/us/app/zkpassport/id6477371975",
	ANDROID: "https://play.google.com/store/apps/details?id=app.zkpassport.zkpassport",
} as const;

/** Reclaim Protocol app store links. */
export const RECLAIM_APP_LINKS = {
	ANDROID: "https://play.google.com/store/apps/details?id=org.reclaimprotocol.app",
} as const;
