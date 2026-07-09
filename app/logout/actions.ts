"use server";

import { clearAuthCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function signOut() {
  await clearAuthCookie();

  redirect("/login");
}
