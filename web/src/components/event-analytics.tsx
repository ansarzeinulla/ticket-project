"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";
import { formatKZT, toTiyn } from "@/lib/money";
import type { EventAnalytics, TicketType } from "@/lib/types";

/**
 * The organizer's analytics for one event (SRS 4.15).
 *
 * Every figure is computed by PostgreSQL from the order, ticket and check-in
 * rows and rendered exactly as received. Nothing is recalculated here, so what
 * is on screen is what a SQL query against the database would return.
 */
export function EventAnalyticsPanel({
  eventID,
  ticketTypes,
}: {
  eventID: string;
  /** Offered as a filter (SRS 4.15). */
  ticketTypes: TicketType[];
}) {
  const t = useT();
  const [data, setData] = useState<EventAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ticketTypeID, setTicketTypeID] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await api.eventAnalytics(
          eventID,
          { from: from || undefined, to: to || undefined, ticketTypeID: ticketTypeID || undefined },
          signal,
        );
        setData(result.analytics);
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.analytics.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [eventID, from, to, ticketTypeID, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = Boolean(from || to || ticketTypeID);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("org.analytics.heading")}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("org.analytics.subtitle")}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          {t("org.common.refresh")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border-subtle bg-surface p-4">
        <div className="space-y-1">
          <label htmlFor="analytics-from" className="block text-xs text-foreground-muted">
            {t("org.analytics.from")}
          </label>
          <input
            id="analytics-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="analytics-to" className="block text-xs text-foreground-muted">
            {t("org.analytics.to")}
          </label>
          <input
            id="analytics-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="analytics-type" className="block text-xs text-foreground-muted">
            {t("org.analytics.ticketType")}
          </label>
          <select
            id="analytics-type"
            value={ticketTypeID}
            onChange={(event) => setTicketTypeID(event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm"
          >
            <option value="">{t("org.analytics.allTypes")}</option>
            {ticketTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        {filtered && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFrom("");
              setTo("");
              setTicketTypeID("");
            }}
          >
            {t("org.analytics.clear")}
          </Button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading && !data ? (
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-6 text-sm text-foreground-muted">
          <Spinner />
          {t("org.analytics.calculating")}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={t("org.analytics.sold")}
              value={String(data.tickets_sold)}
              detail={t("org.analytics.soldDetail", { capacity: data.total_capacity, percent: data.percentage_sold })}
              testID="stat-sold"
            />
            <Stat
              label={t("org.analytics.remaining")}
              value={String(data.tickets_remaining)}
              detail={
                data.tickets_refunded > 0
                  ? t("org.analytics.refundedCount", { count: data.tickets_refunded })
                  : data.orders_count === 1
                    ? t("org.analytics.orderOne")
                    : t("org.analytics.orderMany", { count: data.orders_count })
              }
              testID="stat-remaining"
            />
            <Stat
              label={t("org.analytics.gross")}
              value={formatKZT(data.gross_revenue_kzt)}
              detail={
                toTiyn(data.discounts_kzt) > 0
                  ? t("org.analytics.discounted", { amount: formatKZT(data.discounts_kzt) })
                  : t("org.analytics.noDiscounts")
              }
              testID="stat-revenue"
            />
            <Stat
              label={t("org.analytics.checkedIn")}
              value={String(data.checked_in)}
              detail={t("org.analytics.checkedInDetail", { absent: data.absent, percent: data.check_in_percentage })}
              testID="stat-checkedin"
            />
          </div>

          {toTiyn(data.refunds_kzt) > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat
                label={t("org.analytics.refunded")}
                value={formatKZT(data.refunds_kzt)}
                detail={t("org.analytics.refundedDetail")}
              />
              <Stat
                label={t("org.analytics.net")}
                value={formatKZT(data.net_revenue_kzt)}
                detail={t("org.analytics.netDetail")}
              />
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold">{t("org.analytics.byType")}</h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-border-subtle bg-surface">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs text-foreground-muted">
                    <th className="px-4 py-3 font-medium">{t("org.analytics.ticketType")}</th>
                    <th className="px-4 py-3 font-medium">{t("org.analytics.price")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("org.analytics.colSold")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("org.analytics.colRemaining")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("org.analytics.checkedIn")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("org.analytics.revenue")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle" data-testid="sales-by-type">
                  {data.by_ticket_type.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-foreground-muted">
                        {t("org.analytics.noTypes")}
                      </td>
                    </tr>
                  ) : (
                    data.by_ticket_type.map((row) => (
                      <tr key={row.ticket_type_id}>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-foreground-muted">
                          {formatKZT(row.price_kzt)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.sold}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.remaining}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.checked_in}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatKZT(row.revenue_kzt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {data.by_campaign.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">{t("org.analytics.campaigns")}</h3>
              <ul className="mt-2 space-y-2">
                {data.by_campaign.map((row) => (
                  <li
                    key={row.campaign_id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-sm font-medium">{row.code}</span>
                      <span className="text-xs text-foreground-muted">{row.name}</span>
                    </span>
                    <span className="flex gap-6 text-sm tabular-nums">
                      <span>
                        <span className="block text-xs text-foreground-muted">{t("org.analytics.orders")}</span>
                        {row.redemptions}
                      </span>
                      <span>
                        <span className="block text-xs text-foreground-muted">{t("org.analytics.tickets")}</span>
                        {row.tickets_sold}
                      </span>
                      <span>
                        <span className="block text-xs text-foreground-muted">{t("org.analytics.revenue")}</span>
                        {formatKZT(row.revenue_kzt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.sales_over_time.length > 0 && <SalesChart points={data.sales_over_time} />}
        </>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
  testID,
}: {
  label: string;
  value: string;
  detail: string;
  testID?: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-5" data-testid={testID}>
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-foreground-muted">{detail}</p>
    </div>
  );
}

/**
 * Sales over time, drawn as plain bars.
 *
 * A charting library would be a large dependency for one small figure, and the
 * heights are just a ratio of the day's revenue to the busiest day's. Each bar
 * carries its own numbers as text, so the chart is not the only way to read it.
 */
function SalesChart({ points }: { points: { day: string; orders: number; tickets: number; revenue_kzt: string }[] }) {
  const t = useT();
  const peak = Math.max(...points.map((point) => toTiyn(point.revenue_kzt)), 1);

  return (
    <div>
      <h3 className="text-sm font-semibold">{t("org.analytics.overTime")}</h3>
      <ul className="mt-2 space-y-2 rounded-xl border border-border-subtle bg-surface p-5">
        {points.map((point) => {
          const tiyn = toTiyn(point.revenue_kzt);
          const width = Math.max(2, Math.round((tiyn / peak) * 100));

          return (
            <li key={point.day} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-xs text-foreground-muted tabular-nums">
                {point.day}
              </span>
              <span className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-surface-muted">
                <span
                  className="block h-full rounded bg-brand"
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
              </span>
              <span className="w-40 shrink-0 text-right text-xs tabular-nums">
                {point.tickets === 1 ? t("org.analytics.ticketOne") : t("org.analytics.ticketMany", { count: point.tickets })} ·{" "}
                <span className="font-medium">{formatKZT(point.revenue_kzt)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
