"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Member = { id: string; name: string };

export default function AddExpenseForm({
  groupId,
  members,
  currentUserId,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);
  const [splitBetween, setSplitBetween] = useState<string[]>(
    members.map((m) => m.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggleSplit(userId: string) {
    setSplitBetween((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (splitBetween.length === 0) {
      setError("Select at least one person to split with.");
      return;
    }
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          paidById,
          splitBetween,
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const fieldErrors = data.error;
        if (typeof fieldErrors === "object" && fieldErrors !== null) {
          const first = Object.values(
            fieldErrors as Record<string, string[]>,
          )[0]?.[0];
          setError(first ?? "Something went wrong.");
        } else {
          setError(fieldErrors ?? "Something went wrong.");
        }
        return;
      }

      setTitle("");
      setAmount("");
      setPaidById(currentUserId);
      setSplitBetween(members.map((m) => m.id));
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleCancel() {
    setOpen(false);
    setTitle("");
    setAmount("");
    setPaidById(currentUserId);
    setSplitBetween(members.map((m) => m.id));
    setError(null);
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Add Expense
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border p-4 space-y-4"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label
            htmlFor="title"
            className="text-xs font-medium text-muted-foreground"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Dinner"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition-shadow focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="amount"
            className="text-xs font-medium text-muted-foreground"
          >
            Amount (AED)
          </label>
          <input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition-shadow focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="paidBy"
            className="text-xs font-medium text-muted-foreground"
          >
            Paid by
          </label>
          <select
            id="paidBy"
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition-shadow focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Split between
          </label>
          <div className="space-y-1.5">
            {members.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={splitBetween.includes(m.id)}
                  onChange={() => toggleSplit(m.id)}
                />
                <span className="text-sm">{m.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding..." : "Add Expense"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
