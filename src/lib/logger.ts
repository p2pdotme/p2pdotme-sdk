export interface Logger {
	debug(message: string, data?: Record<string, unknown>): void;
	info(message: string, data?: Record<string, unknown>): void;
	warn(message: string, data?: Record<string, unknown>): void;
	error(message: string, data?: Record<string, unknown>): void;
}

const noop = () => {};

export const noopLogger: Logger = {
	debug: noop,
	info: noop,
	warn: noop,
	error: noop,
};
