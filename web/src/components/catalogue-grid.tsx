"use client";

import { useEffect, useRef, useState } from "react";

import { PosterCard } from "@/components/poster-card";
import { Spinner } from "@/components/ui/button";
import { api } from "@/lib/api";
import { CATALOGUE_PAGE_SIZE as PAGE_SIZE, categoryLabel } from "@/lib/catalogue";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/context";
import type { BiletEvent } from "@/lib/types";



/**
 * The catalogue's poster grid (BF-100). The first page comes with the page;
 * the next ones load as the visitor scrolls near the end, with a spinner, so
 * a catalogue of hundreds of events never loads all at once.
 */
export function CatalogueGrid({
  initial,
  total,
  query,
  showCategory,
}: {
  initial: BiletEvent[];
  total: number;
  query: { category?: string; q?: string; city?: string; startsAfter: string; startsBefore?: string };
  showCategory: boolean;
}) {
  const { t, locale } = useI18n();
  const [events, setEvents] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const more = events.length < total;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !more || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loading) return;
        setLoading(true);
        api
          .listPublicEvents({ ...query, limit: PAGE_SIZE, offset: events.length })
          .then((data) => setEvents((current) => [...current, ...data.events.filter((e) => !current.some((c) => c.id === e.id))]))
          .catch(() => setFailed(true))
          .finally(() => setLoading(false));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [events.length, more, loading, failed, query]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 xl:grid-cols-4" data-testid="catalogue">
        {events.map((event) => (
          <li key={event.id}>
            <PosterCard
              event={event}
              categoryLabel={categoryLabel(t as (key: MessageKey) => string, event.category)}
              showCategory={showCategory}
              locale={locale}
            />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="flex justify-center py-10 text-sm text-foreground-muted" aria-live="polite">
        {more && !failed ? (
          <span className="flex items-center gap-3">
            <Spinner className="text-brand" />
            {t("home.loadingMore")}
          </span>
        ) : events.length > PAGE_SIZE ? (
          t("home.allLoaded")
        ) : null}
      </div>
    </>
  );
}
