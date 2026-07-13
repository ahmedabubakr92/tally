import { z } from "zod";

export const recordSettlementSchema = z.object({
  paidById: z.string().min(1, { error: "Payer is required." }),
  paidToId: z.string().min(1, { error: "Recipient is required." }),
  amount: z
    .number({ error: "Amount must be a valid number." })
    .gt(0, { error: "Amount must be greater than 0." })
    .lte(1_000_000, { error: "Amount is too large." })
    .refine(
      (v) => {
        const str = v.toString();
        const dot = str.indexOf(".");
        return dot === -1 || str.length - dot - 1 <= 2;
      },
      { message: "Amount must have at most 2 decimal places." },
    ),
  idempotencyKey: z.string().min(1),
});

export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>;
