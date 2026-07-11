import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Group name must be at least 2 characters." })
    .max(60, { error: "Group name must not exceed 60 characters." }),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email." })),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
