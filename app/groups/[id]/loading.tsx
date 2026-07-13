import AppHeader from "@/components/AppHeader";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />
  );
}

export default function GroupDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>

        {/* Members */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>

        {/* Balances */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-20" />
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>

        {/* Expenses */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </main>
    </div>
  );
}
