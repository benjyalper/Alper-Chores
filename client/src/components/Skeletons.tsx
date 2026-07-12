export function ScheduleSkeleton() {
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label="Loading schedule">
      <div className="skeleton skeleton--bar" />
      <div className="skeleton-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton skeleton--card" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-wrap" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton--row" />
      ))}
    </div>
  );
}
