"use server";

import { z } from "zod";
import { signInSchema } from "@/lib/validations/auth";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type SignInState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      formError?: string;
    }
  | undefined;

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const result = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors };
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({ where: { email } });

  const invalidMsg = "Invalid email or password";

  if (!user) {
    return { formError: invalidMsg };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return { formError: invalidMsg };
  }

  const token = await signToken({ userId: user.id });
  await setAuthCookie(token);

  redirect("/groups");
}
