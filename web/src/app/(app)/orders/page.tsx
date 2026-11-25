"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { formatInTimezone } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/context";
import { mediaURL } from "@/lib/media";
import { formatKZT } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status";
import type { BuyerOrder } from "@/lib/types";

/**
 * The attendee's own orders (SRS 4.9, SRS 4.7).
 *
 * An order page is reachable by its unguessable id alone, which is what lets a
 * guest keep their tickets without an account. This is the other half of that
 * rule: once somebody has signed up, their tickets have to be findable from the
 * account itself rather than by hunting for the confirmation email. Guest
 * orders placed with the same address are claimed automatically by the API.
 */
export default function MyOrdersPage() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [now] = useState(() => Date.now());

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.listMyOrders(signal);
      setOrders(data.orders);
      setError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof ApiError ? cause.message : t("myOrders.error"));
      setOrders([]);
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (orders === null) {
    return (
      <div className="flex items-center gap-3 text-sm text-foreground-muted">
        <Spinner />
        {t("myOrders.loading")}
      </div>
    );
  }

  const upcoming = orders.filter((order) => new Date(order.event_starts_at).getTime() >= now);
  const past = orders.filter((order) => new Date(order.event_starts_at).getTime() < now).reverse();
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("myOrders.heading")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{t("myOrders.subtitle")}</p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="flex gap-6 border-b border-border-subtle" role="tablist">
        {(["upcoming", "past"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`relative pb-3 text-sm transition-colors ${
              tab === key
                ? "font-semibold after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand"
                : "text-foreground-muted hover:text-foreground"
            }`}
            data-testid={`orders-tab-${key}`}
          >
            {t(key === "upcoming" ? "home.upcomingTickets" : "home.pastTickets")} ({key === "upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {orders.length === 0 && !error ? (
        <div className="rounded-lg bg-surface p-8 text-center text-sm text-foreground-muted ring-1 ring-border-subtle">
          {t("myOrders.empty")}{" "}
          <Link href="/events" className="font-semibold text-brand hover:underline">
            {t("myOrders.browse")}
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-lg bg-surface p-8 text-center text-sm text-foreground-muted ring-1 ring-border-subtle">
          {t(tab === "upcoming" ? "home.noUpcoming" : "home.noPast")}
        </p>
      ) : (
        <ul className="space-y-4">
          {shown.map((order) => {
            const live = order.live_tickets > 0;
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className={`group flex overflow-hidden rounded-lg bg-surface ring-1 ring-border-subtle transition hover:shadow-md ${
                    tab === "past" ? "opacity-80" : ""
                  }`}
                >
                  <div className="w-24 shrink-0 bg-surface-muted sm:w-32">
                    {order.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaURL(order.cover_image_url)} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 p-4 sm:p-5">
                    <h2 className="line-clamp-2 text-lg font-bold leading-snug group-hover:text-brand">{order.event_title}</h2>
                    <p className="text-sm font-semibold">{formatInTimezone(order.event_starts_at, order.timezone, locale)}</p>
                    {order.venue_name && <p className="text-sm text-foreground-muted">{order.venue_name}</p>}
                    <p className="pt-2 text-xs text-foreground-muted">
                      {order.order_number}
                    </p>
                  </div>
                  {/* The stub: perforated edge, ticket count, total and status. */}
                  <div className="relative hidden w-44 shrink-0 flex-col justify-center gap-1 border-l-2 border-dashed border-border-subtle p-5 text-right sm:flex">
                    <span aria-hidden className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-background" />
                    <span aria-hidden className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-background" />
                    <p className="text-sm">
                      {t(order.ticket_count === 1 ? "myOrders.ticketsOne" : "myOrders.ticketsMany", { count: order.ticket_count })}
                    </p>
                    <p className="text-lg font-bold tabular-nums">{formatKZT(order.total_kzt)}</p>
                    <p className={`text-sm font-semibold ${live ? "text-success" : "text-foreground-muted"}`}>
                      {orderStatusLabel(t, order.status)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
