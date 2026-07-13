"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Balance } from "@/lib/balances";

type Member = { id: string; name: string };

export default function SettleUpForm({
  groupId,
  members,
  currentUserId,
  balances,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
  balances: Balance[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paidById, setPaidById] = useState(currentUserId);
  const [paidToId, setPaidToId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );

  // When paidById changes, auto-change paidToId and amount from balances
  function handlePaidByChange(newPaidById: string) {
    setPaidById(newPaidById);
    const debt = balances.find((b) => b.fromUserId === newPaidById);
    if (debt) {
      setPaidToId(debt.toUserId);
      setAmount(debt.amount.toFixed(2));
    } else {
      setPaidToId("");
      setAmount("");
    }
  }

  // When component open, pre-fill for current user
  function handleOpen() {
    const debt = balances.find((b) => b.fromUserId === currentUserId);
    if (debt) {
      setPaidToId(debt.toUserId);
      setAmount(debt.amount.toFixed(2));
    }
    setOpen(true);
  }

  function handleCancel() {
    setOpen(false);
    setPaidById(currentUserId);
    setPaidToId("");
    setAmount("");
    setError(null);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paidToId) {
      setError("Please select who you are paying.");
      return;
    }
    if (paidById === paidToId) {
      setError("Payer and recipient must be different.");
      return;
    }
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidById,
          paidToId,
          amount: parseFloat(amount),
          idempotencyKey,
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

      setOpen(false);
      setPaidById(currentUserId);
      setPaidToId("");
      setAmount("");
      setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  // Don't show the button if everyone is settled up
  if (balances.length === 0 && !open) return null;

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={handleOpen}>
        Settle Up
      </Button>
    );
  }

  return (
    <form
      className="rounded-lg border border-border p-4 space-y-4"
      onSubmit={handleSubmit}
    >
      <h3 className="text-sm font-medium">Record a settlement</h3>

      <div className="space-y-3">
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
            onChange={(e) => handlePaidByChange(e.target.value)}
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
          <label
            htmlFor="paidTo"
            className="text-xs font-medium text-muted-foreground"
          >
            Paid to
          </label>
          <select
            id="paidTo"
            value={paidToId}
            onChange={(e) => setPaidToId(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none transition-shadow focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <option value="">Select recipient</option>
            {members
              .filter((m) => m.id !== paidById)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="settleAmount"
            className="text-xs font-medium text-muted-foreground"
          >
            Amount (AED)
          </label>
          <input
            id="settleAmount"
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
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Recording..." : "Record Settlement"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
