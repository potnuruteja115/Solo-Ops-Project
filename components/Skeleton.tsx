export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-[#e8e2d5] ${className}`} />;
}

/** A card-shaped placeholder shown while a tab loads its data. */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="clay-card space-y-3 p-5" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}
