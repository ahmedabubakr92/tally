"use server";

import { z } from "zod";
import { signUpSchema } from "@/lib/validations/auth";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { redirect } from "next/navigation";

export type SignUpState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
      formError?: string;
    }
  | undefined;

export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const result = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors };
  }

  const { name, email, password } = result.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { formError: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: { name, email, passwordHash },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { formError: "An account with this email already exists" };
    }
    throw e;
  }

  const token = await signToken({ userId: user.id });
  await setAuthCookie(token);

  redirect("/groups");
}
