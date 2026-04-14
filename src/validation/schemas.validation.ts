import { err, ok, type Result } from "neverthrow";
import { isAddress } from "viem";
import { z } from "zod";
import { CURRENCY } from "../constants";

export const ZodAddressSchema = z
	.string()
	.refine((s) => isAddress(s), { message: "Invalid Ethereum address" });

export const ZodCurrencySchema = z.enum(Object.values(CURRENCY) as [string, ...string[]]);

export function validate<S extends z.ZodType, E>(
	schema: S,
	data: unknown,
	toError: (message: string, cause: unknown, data: unknown) => E,
): Result<z.infer<S>, E> {
	const result = schema.safeParse(data);
	if (result.success) {
		return ok(result.data as z.infer<S>);
	}
	return err(toError(z.prettifyError(result.error), result.error, data));
}
