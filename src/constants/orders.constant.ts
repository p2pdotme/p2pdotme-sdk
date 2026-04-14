export const ORDER_TYPE = {
	BUY: 0,
	SELL: 1,
	PAY: 2,
} as const;

export const ORDER_STATUS = {
	PLACED: 0,
	ACCEPTED: 1,
	PAID: 2,
	COMPLETED: 3,
	CANCELLED: 4,
} as const;

export const DISPUTE_STATUS = {
	NONE: 0,
	OPEN: 1,
	RESOLVED: 2,
} as const;
