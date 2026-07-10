"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { TallyMark } from "@/components/TallyMark";

export default function LogInPage() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex items-center justify-center gap-px">
            <TallyMark />
            <span className="text-lg font-semibold tracking-tight">Tally</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Log into your account
            </h1>
          </div>
        </div>

        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={!!state?.errors?.email}
              aria-describedby={
                state?.errors?.email ? "email-error" : undefined
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-shadow focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {state?.errors?.email && (
              <p
                id="email-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={!!state?.errors?.password}
              aria-describedby={
                state?.errors?.password ? "password-error" : undefined
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-shadow focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {state?.errors?.password && (
              <p id="password-error" className="text-xs text-destructive" role="alert">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          {state?.formError && (
            <p className="text-sm text-destructive" role="alert">{state.formError}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full text-base h-11"
            disabled={pending}
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-foreground underline underline-offset-4 hover:opacity-80"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
