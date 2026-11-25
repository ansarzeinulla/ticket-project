import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { AddToCalendar } from "@/components/add-to-calendar";
import { EventAnalyticsTracker } from "@/components/event-analytics-tracker";
import { SeatedPurchase } from "@/components/seated-purchase";
import { ApiError, api } from "@/lib/api";
import { formatInTimezone } from "@/lib/datetime";
import { categoryLabel } from "@/lib/catalogue";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { getTranslations } from "@/lib/i18n/server";
import { mediaURL } from "@/lib/media";
import { formatTiyn, toTiyn } from "@/lib/money";

import { TicketSelector } from "./ticket-selector";

/**
 * The attendee-facing event page.
 *
 * A Server Component: the public endpoint needs no token, so the event and its
 * remaining stock are fetched on the server. That gives a real HTML page for
 * sharing and search, with no loading flash. Only the ticket selector and its
 * checkout are interactive, and they are a Client Component below.
 */
export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { t, locale } = await getTranslations();

  const data = await loadEvent(slug);
  if (!data) notFound();

  // A scanned campaign QR lands here as ?c=CMP_<uuid>. Only the opaque token
  // travels in the link; what it is worth is decided by the server.
  const campaignToken = typeof query.c === "string" && query.c.startsWith("CMP_")
    ? query.c
    : undefined;

  const {
    event,
    ticket_types: ticketTypes,
    on_sale: onSale,
    sold_out: soldOut,
    suspended,
    paid_sales_active: paidSalesActive,
    paid_sales_required: paidSalesRequired,
  } = data;

  // Paid tickets exist but the organizer has not finished activation, so the
  // checkout would refuse them (SRS 4.5). Saying so beats letting somebody
  // pick tickets and fill in a form that cannot succeed.
  const paidSalesPending = paidSalesRequired && !paidSalesActive && !suspended;
  const hasFreeTier = ticketTypes.some((type) => type.is_free);

  const image = mediaURL(event.cover_image_url);
  const prices = ticketTypes.map((type) => toTiyn(type.price_kzt));
  const cheapest = prices.length > 0 ? Math.min(...prices) : null;
  const label = categoryLabel(t as (key: MessageKey) => string, event.category);

  return (
    <main>
      {/*
        Reports the view, and separately whether it arrived through a campaign
        QR (bonus). No token is sent - only the fact that one was present.
      */}
      <EventAnalyticsTracker
        slug={event.slug}
        category={event.category}
        viaCampaignQR={Boolean(campaignToken)}
      />

      {/* The banner (BF-100): the poster blurred behind a dark shade, sharp on the left. */}
      <section className="relative overflow-hidden bg-top text-white">
        {image && (
          // A plain <img>: the poster is served by the Go API, not a next/image domain.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl" />
        )}
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-center sm:px-6 sm:py-14">
          {image && (
            <div className="aspect-[2/3] w-48 shrink-0 self-center overflow-hidden rounded-lg shadow-2xl sm:w-64 sm:self-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`Banner for ${event.title}`} className="h-full w-full object-cover" />
            </div>
          )}
          <header className="min-w-0 flex-1 space-y-5">
            {label && <span className="inline-block rounded bg-brand px-2.5 py-1 text-xs font-semibold">{label}</span>}
            <h1 className="break-words text-3xl font-bold leading-tight sm:text-5xl">{event.title}</h1>

            <dl className="space-y-2 text-sm sm:text-base">
              <div>
                <dt className="sr-only">{t("eventPage.when")}</dt>
                <dd className="font-semibold">{formatInTimezone(event.starts_at, event.timezone, locale)}</dd>
                <dd className="text-white/70">
                  {t("eventPage.until", {
                    time: formatInTimezone(event.ends_at, event.timezone, locale),
                    tz: event.timezone,
                  })}
                </dd>
              </div>
              {event.venue_name && (
                <div>
                  <dt className="sr-only">{t("eventPage.where")}</dt>
                  <dd className="font-semibold">{event.venue_name}</dd>
                  {event.venue_address && <dd className="text-white/70">{event.venue_address}</dd>}
                </div>
              )}
            </dl>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {!suspended && ticketTypes.length > 0 && (
                <a
                  href="#tickets"
                  className="rounded-md bg-brand px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
                  data-testid="book-tickets"
                >
                  {t("home.bookTickets")}
                </a>
              )}
              {cheapest !== null && (
                <p className="text-lg font-semibold">
                  {cheapest === 0 ? t("tickets.free") : t("home.from", { price: formatTiyn(cheapest) })}
                </p>
              )}
            </div>
          </header>
        </div>
      </section>

      <article className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="min-w-0 space-y-8">
          {suspended && (
            <div
              role="alert"
              className="rounded-2xl border border-danger/40 bg-danger-soft p-5"
              data-testid="suspended-banner"
            >
              <h2 className="text-base font-semibold text-danger">
                {t("eventPage.suspendedTitle")}
              </h2>
              <p className="mt-1 text-sm text-danger/90">
                {t("eventPage.suspendedBody")}
              </p>
            </div>
          )}

          {paidSalesPending && (
            <div
              role="status"
              className="rounded-2xl border border-warning/40 bg-warning-soft p-5"
              data-testid="paid-sales-pending-banner"
            >
              <h2 className="text-base font-semibold text-warning">
                {t("eventPage.paidPendingTitle")}
              </h2>
              <p className="mt-1 text-sm text-warning/90">
                {t("eventPage.paidPendingBody")}
                {hasFreeTier
                  ? t("eventPage.paidPendingFree")
                  : t("eventPage.paidPendingCheckBack")}
              </p>
            </div>
          )}

          {event.description && (
            <section className="space-y-3 rounded-lg bg-surface p-6 ring-1 ring-border-subtle">
              <h2 className="text-xl font-bold">{t("home.aboutEvent")}</h2>
              <p className="max-w-[68ch] whitespace-pre-line break-words leading-relaxed">{event.description}</p>
            </section>
          )}

          {event.venue_name && (
            <section className="space-y-2 rounded-lg bg-surface p-6 ring-1 ring-border-subtle">
              <h2 className="text-xl font-bold">{t("eventPage.where")}</h2>
              <p className="font-semibold">{event.venue_name}</p>
              {event.venue_address && <p className="text-foreground-muted">{event.venue_address}</p>}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue_name, event.venue_address].filter(Boolean).join(", "))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-semibold text-brand hover:underline"
              >
                {t("eventPage.openMap")}
              </a>
            </section>
          )}

          <section className="rounded-lg bg-surface p-6 ring-1 ring-border-subtle">
            <AddToCalendar event={event} t={t} />
          </section>

          {event.refund_policy && (
            <section className="rounded-lg bg-surface p-6 ring-1 ring-border-subtle">
              <h2 className="text-base font-bold">{t("eventPage.refundPolicy")}</h2>
              <p className="mt-1 whitespace-pre-line text-sm text-foreground-muted">
                {event.refund_policy}
              </p>
            </section>
          )}
        </div>

        {/*
          With activation outstanding and no free tier there is nothing to
          offer, and the banner above has already explained why. An
          assigned-seating event is bought by picking a seat (SRS 4.3.1).
        */}
        <div
          id="tickets"
          className={`min-w-0 scroll-mt-32 space-y-4 ${
            // A seat map needs the page's width; a ticket list fits the side column.
            event.seating_mode === "assigned_seating" ? "lg:col-span-2" : "lg:sticky lg:top-32 lg:self-start"
          }`}
        >
          {!suspended && !(paidSalesPending && !hasFreeTier) &&
            event.seating_mode === "assigned_seating" && (
              <SeatedPurchase eventID={event.id} eventSlug={event.slug} campaignToken={campaignToken} />
            )}

          {!suspended && !(paidSalesPending && !hasFreeTier) &&
            event.seating_mode !== "assigned_seating" && (
            <TicketSelector
              eventID={event.id}
              eventSlug={event.slug}
              eventTitle={event.title}
              /*
                While activation is outstanding only free tiers are offered:
                the checkout would refuse the paid ones anyway.
              */
              ticketTypes={
                paidSalesPending ? ticketTypes.filter((type) => type.is_free) : ticketTypes
              }
              onSale={onSale}
              soldOut={soldOut}
              campaignToken={campaignToken}
            />
          )}
        </div>
      </article>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadEvent(slug);
  if (!data) return { title: "Event not found" };

  return {
    title: data.event.title,
    description: data.event.description ?? `Tickets for ${data.event.title} on BiletFlow.`,
  };
}

/**
 * Returns null for a 404 so the caller can render notFound(). Cached for the
 * request, so the page and its metadata share one fetch instead of two.
 */
const loadEvent = cache(async (slug: string) => {
  try {
    return await api.getPublicEvent(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});
