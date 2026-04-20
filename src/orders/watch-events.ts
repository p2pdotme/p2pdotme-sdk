import type { Address } from "viem";
import { ABIS } from "../contracts/abis";
import type { PublicClientLike } from "../types";
import { OrdersError } from "./errors";
import type { OrderEvent } from "./types";

export interface WatchEventsParams {
	readonly user?: Address;
	readonly onEvent: (event: OrderEvent) => void;
	readonly onError?: (error: OrdersError) => void;
}

export interface CreateWatchEventsInput {
	readonly publicClient: PublicClientLike;
	readonly diamondAddress: Address;
}

export type WatchEvents = (params: WatchEventsParams) => () => void;

interface EventConfig<T extends OrderEvent["type"]> {
	readonly eventName: string;
	readonly toEvent: (log: {
		args: Record<string, unknown>;
		blockNumber: bigint;
		transactionHash: `0x${string}`;
	}) => Extract<OrderEvent, { type: T }>;
	readonly userFromLog?: (log: { args: Record<string, unknown> }) => Address | undefined;
}

const PLACED_CONFIG: EventConfig<"placed"> = {
	eventName: "OrderPlaced",
	toEvent: (log) => ({
		type: "placed",
		orderId: log.args.orderId as bigint,
		user: log.args.user as Address,
		orderType: log.args.orderType as 0 | 1 | 2,
		blockNumber: log.blockNumber,
		txHash: log.transactionHash,
	}),
	userFromLog: (log) => log.args.user as Address | undefined,
};

const ACCEPTED_CONFIG: EventConfig<"accepted"> = {
	eventName: "OrderAccepted",
	toEvent: (log) => ({
		type: "accepted",
		orderId: log.args.orderId as bigint,
		merchant: log.args.merchant as Address,
		blockNumber: log.blockNumber,
		txHash: log.transactionHash,
	}),
	// OrderAccepted's top-level args are (orderId, merchant, pubKey, _order).
	// The buyer's address lives inside the _order tuple as _order.user.
	userFromLog: (log) => (log.args._order as { user?: Address } | undefined)?.user,
};

const PAID_CONFIG: EventConfig<"paid"> = {
	eventName: "BuyOrderPaid",
	toEvent: (log) => ({
		type: "paid",
		orderId: log.args.orderId as bigint,
		blockNumber: log.blockNumber,
		txHash: log.transactionHash,
	}),
	userFromLog: (log) => log.args.user as Address | undefined,
};

const COMPLETED_CONFIG: EventConfig<"completed"> = {
	eventName: "OrderCompleted",
	toEvent: (log) => ({
		type: "completed",
		orderId: log.args.orderId as bigint,
		blockNumber: log.blockNumber,
		txHash: log.transactionHash,
	}),
	userFromLog: (log) => log.args.user as Address | undefined,
};

const CANCELLED_CONFIG: EventConfig<"cancelled"> = {
	eventName: "CancelledOrders",
	toEvent: (log) => ({
		type: "cancelled",
		orderId: log.args.orderId as bigint,
		blockNumber: log.blockNumber,
		txHash: log.transactionHash,
	}),
	// CancelledOrders's top-level args are (orderId, _order). The buyer's
	// address lives inside the _order tuple as _order.user.
	userFromLog: (log) => (log.args._order as { user?: Address } | undefined)?.user,
};

const ALL_CONFIGS = [
	PLACED_CONFIG,
	ACCEPTED_CONFIG,
	PAID_CONFIG,
	COMPLETED_CONFIG,
	CANCELLED_CONFIG,
] as const;

/**
 * Creates a subscriber over the Diamond's five order lifecycle events
 * (placed, accepted, paid, completed, cancelled). Returns an unsubscribe
 * function that tears down every underlying watcher.
 */
export function createWatchEvents(input: CreateWatchEventsInput): WatchEvents {
	const { publicClient, diamondAddress } = input;

	return ({ user, onEvent, onError }) => {
		const unwatchers: Array<() => void> = [];

		for (const config of ALL_CONFIGS) {
			try {
				const unwatch = (
					publicClient as unknown as {
						watchContractEvent: (args: {
							address: Address;
							abi: typeof ABIS.DIAMOND;
							eventName: string;
							onLogs: (
								logs: Array<{
									args: Record<string, unknown>;
									blockNumber: bigint;
									transactionHash: `0x${string}`;
								}>,
							) => void;
							onError?: (err: Error) => void;
						}) => () => void;
					}
				).watchContractEvent({
					address: diamondAddress,
					abi: ABIS.DIAMOND,
					eventName: config.eventName,
					onLogs: (logs) => {
						for (const log of logs) {
							if (user && config.userFromLog) {
								const logUser = config.userFromLog(log);
								if (!logUser || logUser.toLowerCase() !== user.toLowerCase()) continue;
							}
							onEvent(config.toEvent(log));
						}
					},
					onError: (err) => {
						onError?.(
							new OrdersError(`watchContractEvent failed for ${config.eventName}`, {
								code: "EVENT_WATCH_FAILED",
								cause: err,
								context: { eventName: config.eventName },
							}),
						);
					},
				});
				unwatchers.push(unwatch);
			} catch (err) {
				onError?.(
					new OrdersError(`failed to subscribe to ${config.eventName}`, {
						code: "EVENT_WATCH_FAILED",
						cause: err,
						context: { eventName: config.eventName },
					}),
				);
			}
		}

		return () => {
			for (const u of unwatchers) {
				try {
					u();
				} catch {
					/* ignore unsubscribe errors */
				}
			}
		};
	};
}
