import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { HeroCarousel, type HeroSlide } from "@/components/hero-carousel";
import { PosterCard, PosterPlaceholder, PosterRow } from "@/components/poster-card";
import { api } from "@/lib/api";
import { CATEGORIES, CITY_COOKIE, categoryLabel, isCity } from "@/lib/catalogue";
import { formatInTimezone } from "@/lib/datetime";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { getTranslations } from "@/lib/i18n/server";
import { mediaURL } from "@/lib/media";
import type { BiletEvent } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "BiletFlow — concerts, theatre and events in Kazakhstan" },
};

export const dynamic = "force-dynamic";

/**
 * The storefront (BF-100). Anybody can browse: no account, no redirect. The
 * city picked in the header is a cookie, so this page and the catalogue agree.
 */
export default async function HomePage() {
  const { t, locale } = await getTranslations();
  const cityCookie = (await cookies()).get(CITY_COOKIE)?.value;
  const city = isCity(cityCookie) ? cityCookie : undefined;

  // One request for the soonest events and one per category, in parallel, so
  // every row fills however large the catalogue grows.
  const startsAfter = new Date().toISOString();
  const [soonest, ...perCategory] = await Promise.all([
    api.listPublicEvents({ limit: 24, city, startsAfter }).catch(() => null),
    ...CATEGORIES.map((category) => api.listPublicEvents({ limit: 12, city, category, startsAfter }).catch(() => null)),
  ]);
  const events: BiletEvent[] = soonest?.events ?? [];

  const label = (event: BiletEvent) => categoryLabel(t as (key: MessageKey) => string, event.category);
  const featured = events.filter((event) => event.cover_image_url).slice(0, 5);
  const slides: HeroSlide[] = featured.map((event) => ({
    href: `/events/${event.slug}`,
    image: mediaURL(event.cover_image_url) as string,
    title: event.title,
    kicker: label(event) || t("home.upcoming"),
    when: formatInTimezone(event.starts_at, event.timezone, locale),
    where: [event.venue_name, event.venue_address].filter(Boolean).join(", "),
  }));
  const recommended = events.filter((event) => !featured.includes(event)).slice(0, 12);
  const byCategory = CATEGORIES.map((category, i) => ({
    category,
    events: perCategory[i]?.events ?? [],
    total: perCategory[i]?.total ?? 0,
  }));

  return (
    <main className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6">
      {slides.length > 0 && <HeroCarousel slides={slides} cta={t("home.bookTickets")} />}

      {events.length === 0 ? (
        <p className="rounded-lg bg-surface px-6 py-16 text-center text-foreground-muted ring-1 ring-border-subtle" data-testid="home-empty">
          {t("home.noEvents")}
        </p>
      ) : (
        <>
          <PosterRow
            title={city ? t("home.upcomingIn", { city: t(`cities.${city}`) }) : t("home.recommended")}
            seeAllHref="/events"
            seeAllLabel={t("home.seeAll")}
            testID="row-recommended"
          >
            {(recommended.length > 0 ? recommended : events).map((event) => (
              <PosterCard key={event.id} event={event} categoryLabel={label(event)} locale={locale} className="w-40 shrink-0 sm:w-48" />
            ))}
          </PosterRow>

          <section className="space-y-4">
            <h2 className="text-xl font-bold sm:text-2xl">{t("home.browseByCategory")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {byCategory.map(({ category, events: group, total }) => {
                const cover = mediaURL(group.find((event) => event.cover_image_url)?.cover_image_url);
                return (
                  <Link
                    key={category}
                    href={`/events?category=${category}`}
                    className="group overflow-hidden rounded-lg bg-surface ring-1 ring-border-subtle transition hover:ring-brand"
                    data-testid={`category-${category}`}
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-surface-muted">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                      ) : (
                        <PosterPlaceholder label={t(`categories.${category}`)} />
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-sm font-semibold group-hover:text-brand">{t(`categories.${category}`)}</p>
                      <p className="text-xs text-foreground-muted">
                        {total === 1 ? t("home.resultOne") : t("home.results", { count: total })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {byCategory
            .filter((group) => group.events.length > 0)
            .map(({ category, events: group }) => (
              <PosterRow
                key={category}
                title={t(`categories.${category}`)}
                seeAllHref={`/events?category=${category}`}
                seeAllLabel={t("home.seeAll")}
                testID={`row-${category}`}
              >
                {group.map((event) => (
                  <PosterCard
                    key={event.id}
                    event={event}
                    categoryLabel={label(event)}
                    showCategory={false}
                    locale={locale}
                    className="w-40 shrink-0 sm:w-48"
                  />
                ))}
              </PosterRow>
            ))}
        </>
      )}
    </main>
  );
}
