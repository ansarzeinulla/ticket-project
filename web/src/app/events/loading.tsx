/** Shown while the catalogue is fetched (BF-100). */
export default function CatalogueLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6" aria-busy="true">
      <div className="h-9 w-48 animate-pulse rounded bg-surface-muted" />
      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[2/3] animate-pulse rounded-lg bg-surface-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
          </div>
        ))}
      </div>
    </main>
  );
}
