/** Shown the moment an event is clicked, while its page is fetched (BF-100). */
export default function EventLoading() {
  return (
    <main aria-busy="true">
      <section className="bg-top">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-center sm:px-6 sm:py-14">
          <div className="aspect-[2/3] w-48 shrink-0 animate-pulse self-center rounded-lg bg-white/10 sm:w-64" />
          <div className="flex-1 space-y-4">
            <div className="h-5 w-24 animate-pulse rounded bg-white/15" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-white/15" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-white/10" />
            <div className="h-11 w-40 animate-pulse rounded-md bg-brand/60" />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
        <div className="h-40 animate-pulse rounded-lg bg-surface ring-1 ring-border-subtle" />
        <div className="h-24 animate-pulse rounded-lg bg-surface ring-1 ring-border-subtle" />
      </div>
    </main>
  );
}
