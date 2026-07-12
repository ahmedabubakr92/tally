import { z } from "zod";

export const addExpenseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Title is required." })
    .max(100, { error: "Title must not exceed 100 characters." }),
  amount: z
    .number({ error: "Amount must be a valid number" })
    .gt(0, { error: "Amount must be greater than 0" })
    .lte(1_000_000, { error: "Amount is too large" }),
  paidById: z.string().min(1, { error: "Payer is required." }),
  splitBetween: z
    .array(z.string())
    .min(1, { error: "Select at least one person to split with." }),
  idempotencyKey: z.string().min(1),
});

export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
