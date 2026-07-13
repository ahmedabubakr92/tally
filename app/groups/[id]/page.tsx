import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeBalances } from "@/lib/balances";
import AppHeader from "@/components/AppHeader";
import AddMemberForm from "@/components/AddMemberForm";
import AddExpenseForm from "@/components/AddExpenseForm";
import { formatActivity } from "@/lib/utils";
import SettleUpForm from "@/components/SettleUpForm";
import GroupEventListener from "@/components/GroupEventListener";

export default async function GroupDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const { id: groupId } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) notFound();

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      expenses: {
        include: {
          paidBy: { select: { name: true } },
          splits: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      settlements: {
        include: {
          paidBy: { select: { id: true, name: true } },
          paidTo: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!group) notFound();

  const nameById = new Map(group.members.map((m) => [m.userId, m.user.name]));

  const balances = computeBalances(group.expenses, group.settlements);

  const members = group.members.map((m) => ({
    id: m.userId,
    name: m.user.name,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <GroupEventListener groupId={groupId} />
        <div className="space-y-1">
          <Link
            href="/groups"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Groups
          </Link>
          <h1 className="text-xl font-semibold">{group.name}</h1>
          <p className="text-xs text-muted-foreground">
            Created{" "}
            {new Date(group.createdAt).toLocaleDateString("en-AE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Members */}
        <section className="space-y-3">
          <h2 className="font-medium">Members ({group.members.length})</h2>
          <ul className="space-y-3">
            {group.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.user.email}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <AddMemberForm groupId={groupId} />
        </section>

        {/* Balances */}
        <section className="space-y-3">
          <h2 className="font-medium">Balances</h2>
          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">All settled up.</p>
          ) : (
            <ul className="space-y-2">
              {balances.map((b) => (
                <li
                  key={`${b.fromUserId}-${b.toUserId}`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <span className="text-sm">
                    <span className="font-medium">
                      {nameById.get(b.fromUserId)}
                    </span>
                    {" owes "}
                    <span className="font-medium">
                      {nameById.get(b.toUserId)}
                    </span>
                  </span>
                  <span className="text-sm font-medium text-destructive">
                    AED{" "}
                    {b.amount.toLocaleString("en-AE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <SettleUpForm
            groupId={groupId}
            members={members}
            currentUserId={userId}
            balances={balances}
          />
        </section>

        {/* Expenses */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Expenses ({group.expenses.length})</h2>
            <AddExpenseForm
              groupId={groupId}
              members={members}
              currentUserId={userId}
            />
          </div>
          {group.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {group.expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{expense.title}</span>
                    <span className="text-sm font-medium">
                      AED{" "}
                      {Number(expense.amount).toLocaleString("en-AE", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid by {expense.paidBy.name} · split between{" "}
                    {expense.splits.map((s) => s.user.name).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(expense.createdAt).toLocaleDateString("en-AE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Actvity Logs */}
        {group.activities.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-medium">Activity</h2>
            <ul className="space-y-2">
              {group.activities.map((activity) => (
                <li key={activity.id} className="text-sm text-muted-foreground">
                  {formatActivity(activity)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
