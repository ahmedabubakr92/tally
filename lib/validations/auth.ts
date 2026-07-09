import { z } from "zod";

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(50, { error: "Name must not exceed 50 characters." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Please enter a valid email address." })),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .max(32, { error: "Password must not exceed 32 characters." }),
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Please enter a valid email address." })),
  password: z.string().min(1, { error: "Password is required." }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
