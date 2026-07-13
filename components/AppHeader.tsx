import { TallyMark } from "./TallyMark";
import { Button } from "@/components/ui/button";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/app/logout/actions";
import { ThemeToggle } from "./ThemeToggle";

export default async function AppHeader() {
  const userId = await getCurrentUserId();

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
    : null;

  return (
    <header className="border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-px">
          <TallyMark />
          <span className="font-semibold tracking-tight">Tally</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>

          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
