export default function AdminLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-label="Loading admin page">
      <div className="h-8 w-48 bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 border bg-card p-4">
            <div className="mb-3 h-3 w-20 bg-muted" />
            <div className="h-6 w-28 bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
