import { z } from "zod";

export const recordSettlementSchema = z.object({
  paidById: z.string().min(1, { error: "Payer is required." }),
  paidToId: z.string().min(1, { error: "Recipient is required." }),
  amount: z
    .number({ error: "Amount must be a valid number." })
    .gt(0, { error: "Amount must be greater than 0." })
    .lte(1_000_000, { error: "Amount is too large." }),
  idempotencyKey: z.string().min(1),
});

export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>;
