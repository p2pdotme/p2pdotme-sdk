import type z from "zod";
import type { ZodCurrencySchema } from "../validation";

export type CurrencyType = z.infer<typeof ZodCurrencySchema>;
