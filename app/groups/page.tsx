import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeBalances } from "@/lib/balances";
import AppHeader from "@/components/AppHeader";
import CreateGroupForm from "@/components/CreateGroupForm";

export default async function GroupsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { name: true } } },
      },
      expenses: {
        select: {
          paidById: true,
          splits: { select: { userId: true, shareAmount: true } },
        },
      },
      settlements: {
        select: { paidById: true, paidToId: true, amount: true },
      },
      _count: { select: { expenses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Your Groups</h1>
          <CreateGroupForm />
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            No groups yet. Create one to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {groups.map((group) => {
              const balances = computeBalances(
                group.expenses,
                group.settlements,
              );

              const net = balances.reduce((acc, b) => {
                if (b.fromUserId === userId) return acc - b.amount;
                if (b.toUserId === userId) return acc + b.amount;
                return acc;
              }, 0);

              return (
                <li key={group.id}>
                  <Link
                    href={`/groups/${group.id}`}
                    className="block rounded-lg border border-border px-4 py-4 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{group.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {group._count.expenses}{" "}
                        {group._count.expenses === 1 ? "expense" : "expenses"}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-sm text-muted-foreground truncate">
                        {group.members.length}{" "}
                        {group.members.length === 1 ? "member" : "members"}
                        {" · "}
                        {group.members.map((m) => m.user.name).join(", ")}
                      </p>
                      {Math.abs(net) >= 0.01 && (
                        <span
                          className={`text-xs font-medium ${
                            net > 0 ? "text-green-600" : "text-destructive"
                          }`}
                        >
                          {net > 0
                            ? `you are owed AED ${net.toLocaleString("en-AE", { minimumFractionDigits: 2 })}`
                            : `you owe AED ${Math.abs(net).toLocaleString("en-AE", { minimumFractionDigits: 2 })}`}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
