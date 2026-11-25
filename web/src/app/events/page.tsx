import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { CatalogueGrid } from "@/components/catalogue-grid";
import { api } from "@/lib/api";
import { CATALOGUE_PAGE_SIZE as PAGE_SIZE, CATEGORIES, CITY_COOKIE, isCategory, isCity } from "@/lib/catalogue";
import { WHEN, isWhen, rangeFor } from "@/lib/date-ranges";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { getTranslations } from "@/lib/i18n/server";
import type { BiletEvent } from "@/lib/types";

export const metadata: Metadata = {
  title: "Events",
  description: "Concerts, theatre, stand-up and sports on BiletFlow.",
};

/**
 * The public catalogue (SRS 1.2: "Attendees will be able to discover events"),
 * laid out like a ticketing storefront (BF-100): filters on the left, posters
 * on the right, more loading as the visitor scrolls.
 *
 * The API decides what is listed: GET /events forces published and public, so
 * unlisted events stay reachable by link only and private ones stay invisible.
 */
export const dynamic = "force-dynamic";

export default async function EventCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; when?: string }>;
}) {
  const { t } = await getTranslations();
  const params = await searchParams;
  const category = isCategory(params.category) ? params.category : undefined;
  const q = params.q?.trim() || undefined;
  const when = isWhen(params.when) ? params.when : undefined;
  const cityCookie = (await cookies()).get(CITY_COOKIE)?.value;
  const city = isCity(cityCookie) ? cityCookie : undefined;
  const range = rangeFor(when);
  const query = { category, q, city, startsAfter: range.after, startsBefore: range.before };

  let events: BiletEvent[] = [];
  let total = 0;
  let failed = false;
  try {
    const data = await api.listPublicEvents({ ...query, limit: PAGE_SIZE, offset: 0 });
    events = data.events;
    total = data.total ?? data.events.length;
  } catch {
    failed = true;
  }

  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ category, q, when, ...changes })) {
      if (value) next.set(key, value);
    }
    const s = next.toString();
    return s ? `/events?${s}` : "/events";
  };
  const option = (active: boolean, link: string, label: string, testID: string) => (
    <Link
      key={testID}
      href={link}
      aria-current={active ? "true" : undefined}
      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-brand-soft font-semibold text-brand-strong" : "hover:bg-surface-muted"
      }`}
      data-testid={testID}
    >
      {label}
    </Link>
  );
  const heading = category
    ? t(`categories.${category}`)
    : q
      ? `“${q}”`
      : city
        ? t("home.eventsIn", { city: t(`cities.${city}`) })
        : t("catalogue.title");

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
        <section className="rounded-lg bg-surface p-3 ring-1 ring-border-subtle">
          <h2 className="px-3 pb-2 pt-1 text-sm font-bold">{t("home.date")}</h2>
          {option(!when, href({ when: undefined }), t("home.anyDate"), "when-any")}
          {WHEN.map((w) => option(when === w, href({ when: w }), t(`home.${w}` as MessageKey), `when-${w}`))}
        </section>
        <section className="rounded-lg bg-surface p-3 ring-1 ring-border-subtle">
          <h2 className="px-3 pb-2 pt-1 text-sm font-bold">{t("home.categoriesHeading")}</h2>
          {option(!category, href({ category: undefined }), t("home.allCategories"), "filter-all")}
          {CATEGORIES.map((c) => option(category === c, href({ category: c }), t(`categories.${c}`), `filter-${c}`))}
        </section>
      </aside>

      <div className="min-w-0 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{heading}</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              {total === 1 ? t("home.resultOne") : t("home.results", { count: total })}
            </p>
          </div>
          {(category || q || when) && (
            <Link href="/events" className="text-sm font-semibold text-brand hover:underline">
              {t("home.clearFilters")}
            </Link>
          )}
        </header>

        {failed ? (
          <p className="rounded-lg bg-surface px-6 py-16 text-center text-sm text-foreground-muted ring-1 ring-border-subtle">
            {t("catalogue.unavailable")}
          </p>
        ) : events.length === 0 ? (
          <p
            className="rounded-lg bg-surface px-6 py-16 text-center text-sm text-foreground-muted ring-1 ring-border-subtle"
            data-testid="catalogue-empty"
          >
            {t("catalogue.emptyFirst")}
          </p>
        ) : (
          // Keyed on the filters, so a new filter starts a fresh list.
          <CatalogueGrid
            key={JSON.stringify(query)}
            initial={events}
            total={total}
            query={query}
            showCategory={!category}
          />
        )}
      </div>
    </main>
  );
}
