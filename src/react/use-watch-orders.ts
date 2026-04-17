import { useEffect, useRef } from "react";
import type { OrdersError } from "../orders/errors";
import type { OrderEvent } from "../orders/types";
import type { WatchEventsParams } from "../orders/watch-events";
import { useOrders } from "./sdk-provider";

/**
 * Subscribes to Diamond order lifecycle events for the lifetime of the
 * component. Unsubscribes automatically on unmount or when `user` changes.
 *
 * Callbacks are captured in refs so consumers may pass inline arrow
 * functions without causing the underlying subscriptions to thrash on
 * every render.
 */
export function useWatchOrders(params: WatchEventsParams): void {
	const orders = useOrders();
	const { user, onEvent, onError } = params;

	const onEventRef = useRef(onEvent);
	const onErrorRef = useRef(onError);
	onEventRef.current = onEvent;
	onErrorRef.current = onError;

	useEffect(() => {
		const unsubscribe = orders.watchEvents({
			user,
			onEvent: (event: OrderEvent) => onEventRef.current(event),
			onError: (error: OrdersError) => onErrorRef.current?.(error),
		});
		return unsubscribe;
	}, [orders, user]);
}
