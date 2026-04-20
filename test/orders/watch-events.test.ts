import { describe, expect, it, vi } from "vitest";
import { createWatchEvents } from "../../src/orders/watch-events";

const DIAMOND = "0x000000000000000000000000000000000000beef" as const;
const USER = "0x000000000000000000000000000000000000c0de" as const;

function makePublicClient() {
	const unwatch = vi.fn();
	const handlers: Record<string, (logs: unknown[]) => void> = {};
	const watchContractEvent = vi.fn(({ eventName, onLogs }) => {
		handlers[eventName] = onLogs;
		return unwatch;
	});
	const client = { watchContractEvent };
	return { client, handlers, unwatch };
}

describe("watchEvents", () => {
	it("subscribes to all 5 lifecycle events and returns an unsubscribe", () => {
		const { client, unwatch } = makePublicClient();
		const watch = createWatchEvents({ publicClient: client as never, diamondAddress: DIAMOND });
		const onEvent = vi.fn();

		const unsubscribe = watch({ onEvent });

		expect(client.watchContractEvent).toHaveBeenCalledTimes(5);
		unsubscribe();
		expect(unwatch).toHaveBeenCalledTimes(5);
	});

	it("emits a normalized 'placed' event when OrderPlaced log arrives", () => {
		const { client, handlers } = makePublicClient();
		const watch = createWatchEvents({ publicClient: client as never, diamondAddress: DIAMOND });
		const onEvent = vi.fn();
		watch({ onEvent });

		handlers.OrderPlaced([
			{
				args: { orderId: 7n, user: USER, orderType: 0 },
				blockNumber: 100n,
				transactionHash: "0xabc",
			},
		]);

		expect(onEvent).toHaveBeenCalledWith({
			type: "placed",
			orderId: 7n,
			user: USER,
			orderType: 0,
			blockNumber: 100n,
			txHash: "0xabc",
		});
	});

	it("filters by user when provided (only emits events for that user)", () => {
		const { client, handlers } = makePublicClient();
		const watch = createWatchEvents({ publicClient: client as never, diamondAddress: DIAMOND });
		const onEvent = vi.fn();
		watch({ user: USER, onEvent });

		handlers.OrderPlaced([
			{
				args: { orderId: 7n, user: USER, orderType: 0 },
				blockNumber: 100n,
				transactionHash: "0xabc",
			},
			{
				args: { orderId: 8n, user: "0x0000000000000000000000000000000000000111", orderType: 0 },
				blockNumber: 101n,
				transactionHash: "0xdef",
			},
		]);

		expect(onEvent).toHaveBeenCalledTimes(1);
		expect(onEvent.mock.calls[0][0].orderId).toBe(7n);
	});

	it("filters accepted events by user via the nested _order.user field", () => {
		const { client, handlers } = makePublicClient();
		const watch = createWatchEvents({ publicClient: client as never, diamondAddress: DIAMOND });
		const onEvent = vi.fn();
		watch({ user: USER, onEvent });

		handlers.OrderAccepted([
			{
				args: { orderId: 9n, merchant: "0x000000000000000000000000000000000000d1d1", _order: { user: USER } },
				blockNumber: 200n,
				transactionHash: "0xa1",
			},
			{
				args: { orderId: 10n, merchant: "0x000000000000000000000000000000000000d1d1", _order: { user: "0x0000000000000000000000000000000000000222" } },
				blockNumber: 201n,
				transactionHash: "0xa2",
			},
		]);

		expect(onEvent).toHaveBeenCalledTimes(1);
		expect(onEvent.mock.calls[0][0]).toMatchObject({ type: "accepted", orderId: 9n });
	});

	it("filters cancelled events by user via the nested _order.user field", () => {
		const { client, handlers } = makePublicClient();
		const watch = createWatchEvents({ publicClient: client as never, diamondAddress: DIAMOND });
		const onEvent = vi.fn();
		watch({ user: USER, onEvent });

		handlers.CancelledOrders([
			{ args: { orderId: 11n, _order: { user: USER } }, blockNumber: 300n, transactionHash: "0xc1" },
			{ args: { orderId: 12n, _order: { user: "0x0000000000000000000000000000000000000333" } }, blockNumber: 301n, transactionHash: "0xc2" },
		]);

		expect(onEvent).toHaveBeenCalledTimes(1);
		expect(onEvent.mock.calls[0][0]).toMatchObject({ type: "cancelled", orderId: 11n });
	});

	it("forwards onError with EVENT_WATCH_FAILED when watchContractEvent throws", () => {
		const watchContractEvent = vi.fn(() => {
			throw new Error("ws closed");
		});
		const watch = createWatchEvents({
			publicClient: { watchContractEvent } as never,
			diamondAddress: DIAMOND,
		});
		const onError = vi.fn();
		const onEvent = vi.fn();

		watch({ onEvent, onError });

		expect(onError).toHaveBeenCalled();
		expect(onError.mock.calls[0][0].code).toBe("EVENT_WATCH_FAILED");
	});
});
