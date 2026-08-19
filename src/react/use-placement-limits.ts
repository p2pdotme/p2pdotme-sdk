import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import type { OrdersError } from "../orders/errors";
import type { PlacementLimits } from "../orders/types";
import { useOrders } from "./sdk-provider";

export interface UsePlacementLimitsParams {
	/** Omit or pass undefined while no wallet is connected — no request is made. */
	readonly userAddress?: Address;
	/** Optional polling interval in ms. Omit for no polling. */
	readonly pollMs?: number;
}

export interface UsePlacementLimitsResult {
	limits: PlacementLimits | null;
	isLoading: boolean;
	error: OrdersError | null;
	/** Refetches immediately. Call after a placement lands so the count catches up. */
	refresh: () => void;
}

/**
 * Reads the user's daily order placement allowances and keeps them fresh:
 * refetches on address change, on an optional interval, and once the UTC day
 * rolls over so a form left open across midnight stops showing a spent bucket.
 *
 * Advisory only — the subgraph lags the chain, so use this to warn or disable a
 * control, never to decide whether a placement is legal.
 */
export function usePlacementLimits(params: UsePlacementLimitsParams): UsePlacementLimitsResult {
	const orders = useOrders();
	const { userAddress, pollMs } = params;

	const [limits, setLimits] = useState<PlacementLimits | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<OrdersError | null>(null);

	// Guards against a slow earlier response overwriting a newer one, and
	// against setting state after unmount.
	const requestIdRef = useRef(0);
	const mountedRef = useRef(true);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const refresh = useCallback(() => {
		if (!userAddress) {
			requestIdRef.current++;
			setLimits(null);
			setError(null);
			setIsLoading(false);
			return;
		}

		const requestId = ++requestIdRef.current;
		setIsLoading(true);

		orders.getPlacementLimits({ userAddress }).match(
			(next) => {
				if (!mountedRef.current || requestId !== requestIdRef.current) return;
				setLimits(next);
				setError(null);
				setIsLoading(false);
			},
			(cause) => {
				if (!mountedRef.current || requestId !== requestIdRef.current) return;
				// Keep the last good value on screen rather than blanking the counter
				// on a transient subgraph failure.
				setError(cause);
				setIsLoading(false);
			},
		);
	}, [orders, userAddress]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	useEffect(() => {
		if (!pollMs || !userAddress) return;
		const timer = setInterval(refresh, pollMs);
		return () => clearInterval(timer);
	}, [pollMs, userAddress, refresh]);

	// The buckets reset at UTC midnight. Without this a user who leaves the
	// order form open overnight keeps seeing yesterday's exhausted count and
	// concludes they are still blocked.
	useEffect(() => {
		if (!limits || !userAddress) return;
		const msUntilReset = limits.resetsAt * 1000 - Date.now();
		if (msUntilReset <= 0) return;
		const timer = setTimeout(refresh, msUntilReset + 1_000);
		return () => clearTimeout(timer);
	}, [limits, userAddress, refresh]);

	return { limits, isLoading, error, refresh };
}
