import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
            {groups.map((group) => (
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
                  <p className="text-sm text-muted-foreground mt-1">
                    {group.members.length}{" "}
                    {group.members.length === 1 ? "member" : "members"}
                    {" · "}
                    {group.members.map((m) => m.user.name).join(", ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
