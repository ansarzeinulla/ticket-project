import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderSupport } from "@/components/order-support";
import { TicketCard } from "@/components/ticket-card";
import { ApiError, api } from "@/lib/api";
import { getTranslations } from "@/lib/i18n/server";
import { orderStatusLabel } from "@/lib/order-status";
import { AddToCalendar } from "@/components/add-to-calendar";
import { formatKZT } from "@/lib/money";
import { formatInTimezone } from "@/lib/datetime";
import { mediaURL } from "@/lib/media";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("order.metaTitle") };
}

/**
 * The order confirmation, at its own URL so it survives a refresh and can be
 * shared. The order id is a UUID, which is the unguessable capability that
 * makes this safe to serve without a login - a guest checkout has no account
 * to authenticate against.
 */
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t, locale } = await getTranslations();

  let data;
  try {
    data = await api.getOrder(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { order, items, tickets } = data;

  // The event, for the calendar links. Public for a published event; if it is
  // not readable any more, the confirmation simply goes without them.
  const event = await api.getEvent(order.event_id).catch(() => null);

  const image = mediaURL(event?.cover_image_url);

  return (
    <main>
      {/* The event banner, like the event page's, with the confirmation on it. */}
      <section className="relative overflow-hidden bg-top text-white">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl" />
        )}
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto flex max-w-5xl items-center gap-6 px-4 py-8 sm:px-6 sm:py-10">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="hidden aspect-[2/3] w-28 shrink-0 rounded-md object-cover shadow-xl sm:block" />
          )}
          <div className="min-w-0 space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span aria-hidden className="grid h-6 w-6 place-items-center rounded bg-success text-xs">
                ✓
              </span>
              {t("order.confirmed")}
            </p>
            {event ? (
              <Link href={`/events/${event.slug}`} className="block text-2xl font-bold leading-tight hover:underline sm:text-4xl">
                {event.title}
              </Link>
            ) : null}
            {event && (
              <p className="text-sm text-white/80">
                {formatInTimezone(event.starts_at, event.timezone, locale)}
                {event.venue_name ? `, ${event.venue_name}` : ""}
              </p>
            )}
            <p className="text-sm text-white/70">
              {tickets.length === 1
                ? t("order.issuedOne", { count: tickets.length, email: order.buyer_email })
                : t("order.issuedMany", { count: tickets.length, email: order.buyer_email })}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 space-y-4">
          <div>
            <h2 className="text-xl font-bold">{t("order.yourTickets")}</h2>
            <p className="mt-1 text-sm text-foreground-muted">{t("order.ticketsHint")}</p>
          </div>
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </ul>
          <OrderSupport orderID={order.id} buyerEmail={order.buyer_email} />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <section className="rounded-lg bg-surface p-5 ring-1 ring-border-subtle">
            <h2 className="font-bold">{t("home.orderDetails")}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-muted">{t("order.orderNumber")}</dt>
                <dd className="font-semibold">{order.order_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-foreground-muted">{t("order.status")}</dt>
                <dd className="font-semibold text-success">{orderStatusLabel(t, order.status)}</dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-2 border-t border-border-subtle pt-4 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span className="min-w-0">
                    {item.ticket_type_name}
                    <span className="block text-xs text-foreground-muted">
                      {item.quantity} × {formatKZT(item.unit_price_kzt)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatKZT(item.line_total_kzt)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between gap-4 border-t border-border-subtle pt-4 font-bold">
              <span>{t("order.totalPaid")}</span>
              <span className="tabular-nums">{formatKZT(order.total_kzt)}</span>
            </p>
          </section>

          {event && (
            <section className="rounded-lg bg-surface p-5 ring-1 ring-border-subtle">
              <AddToCalendar event={event} t={t} />
            </section>
          )}

          <Link href="/" className="block text-sm font-semibold text-brand hover:underline">
            {t("order.back")}
          </Link>
        </aside>
      </div>
    </main>
  );
}
