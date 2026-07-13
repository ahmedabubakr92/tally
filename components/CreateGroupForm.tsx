"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CreateGroupForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        const fieldError = data.error?.name?.[0];
        setError(fieldError ?? data.error ?? "Something went wrong.");
        return;
      }

      setName("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again");
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setName("");
    setError(null);
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        New Group
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-start gap-2 w-full"
    >
      <div className="space-y-1 w-full sm:w-auto">
        <input
          type="text"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          aria-label="Group name"
          aria-invalid={!!error}
          className="w-full sm:w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition-shadow focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating..." : "Create"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
