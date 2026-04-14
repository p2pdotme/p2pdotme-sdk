import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { createFraudEngine } from "../fraud-engine/client";
import type { FraudEngine } from "../fraud-engine/types";
import { createOrderRouter } from "../order-routing/client";
import { createPayloadGenerator } from "../payload/client";
import { createProfile } from "../profile/client";
import { createZkkyc } from "../zkkyc/client";
import type { Sdk, SdkConfig } from "./types";

const SdkContext = createContext<Sdk | null>(null);

/**
 * Provides Profile, OrderRouter, PayloadGenerator, Zkkyc, and FraudEngine instances to all children.
 *
 * Object props (`publicClient`, `logger`) are captured on mount and do **not** trigger
 * re-instantiation on subsequent renders. To swap them (e.g. switching chains), remount
 * the provider with a React `key`:
 *
 * ```tsx
 * <SdkProvider key={chainId} publicClient={client} ...>
 * ```
 *
 * Primitive props (`subgraphUrl`, `diamondAddress`, etc.) are compared by value and will
 * trigger re-instantiation when they actually change.
 */
export function SdkProvider({ children, ...config }: SdkConfig & { readonly children: ReactNode }) {
	// Capture object references on mount — prevents re-instantiation from
	// parent re-renders that create new-but-equivalent objects inline.
	const publicClientRef = useRef(config.publicClient);
	const loggerRef = useRef(config.logger);

	const publicClient = publicClientRef.current;
	const logger = loggerRef.current;

	const fraudEngineApiUrl = config.fraudEngine?.apiUrl;
	const fraudEngineEncryptionKey = config.fraudEngine?.encryptionKey;
	const fraudEngineSeonRegion = config.fraudEngine?.seonRegion;

	const fraudEngine = useMemo<FraudEngine | undefined>(() => {
		if (!fraudEngineApiUrl || !fraudEngineEncryptionKey) return undefined;
		return createFraudEngine({
			apiUrl: fraudEngineApiUrl,
			encryptionKey: fraudEngineEncryptionKey,
			seonRegion: fraudEngineSeonRegion,
			logger,
		});
	}, [fraudEngineApiUrl, fraudEngineEncryptionKey, fraudEngineSeonRegion, logger]);

	const initedRef = useRef<FraudEngine | null>(null);
	useEffect(() => {
		if (!fraudEngine) return;
		if (initedRef.current === fraudEngine) return;
		initedRef.current = fraudEngine;
		fraudEngine.init();
	}, [fraudEngine]);

	const sdk = useMemo<Sdk>(() => {
		const orderRouter = createOrderRouter({
			publicClient,
			subgraphUrl: config.subgraphUrl,
			contractAddress: config.diamondAddress,
			logger,
		});

		return {
			profile: createProfile({
				publicClient,
				diamondAddress: config.diamondAddress,
				usdcAddress: config.usdcAddress,
			}),
			orderRouter,
			payload: createPayloadGenerator({ orderRouter }),
			zkkyc: config.reputationManagerAddress
				? createZkkyc({
						reputationManagerAddress: config.reputationManagerAddress,
					})
				: undefined,
			fraudEngine,
		};
	}, [
		publicClient,
		config.subgraphUrl,
		config.diamondAddress,
		config.usdcAddress,
		config.reputationManagerAddress,
		logger,
		fraudEngine,
	]);

	return <SdkContext.Provider value={sdk}>{children}</SdkContext.Provider>;
}

/** Returns the full SDK object from the nearest SdkProvider. */
export function useSdk(): Sdk {
	const sdk = useContext(SdkContext);
	if (!sdk) {
		throw new Error("useSdk must be used within a <SdkProvider>");
	}
	return sdk;
}

/** Returns the Profile instance from the nearest SdkProvider. */
export function useProfile() {
	return useSdk().profile;
}

/** Returns the OrderRouter instance from the nearest SdkProvider. */
export function useOrderRouter() {
	return useSdk().orderRouter;
}

/** Returns the PayloadGenerator instance from the nearest SdkProvider. */
export function usePayloadGenerator() {
	return useSdk().payload;
}

/** Returns the Zkkyc instance from the nearest SdkProvider. */
export function useZkkyc() {
	const zkkyc = useSdk().zkkyc;
	if (!zkkyc) {
		throw new Error("useZkkyc requires reputationManagerAddress to be passed to SdkProvider");
	}
	return zkkyc;
}

/** Returns the FraudEngine instance from the nearest SdkProvider. */
export function useFraudEngine() {
	const fraudEngine = useSdk().fraudEngine;
	if (!fraudEngine) {
		throw new Error("useFraudEngine requires fraudEngine config to be passed to SdkProvider");
	}
	return fraudEngine;
}
