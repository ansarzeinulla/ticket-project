"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { formatKZT } from "@/lib/money";
import { formatInTimezone } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { Translator } from "@/lib/i18n/translate";
import type { EventOrder } from "@/lib/types";

/** How an order's status reads, and how it looks. */
const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success-soft text-success",
  completed: "bg-success-soft text-success",
  refunded: "bg-danger-soft text-danger",
  partially_refunded: "bg-warning-soft text-warning",
  cancelled: "bg-surface-muted text-foreground-muted",
  pending: "bg-surface-muted text-foreground-muted",
};

const STATUS_LABELS: Record<string, MessageKey> = {
  paid: "org.orders.status.paid",
  completed: "org.orders.status.completed",
  refunded: "org.orders.status.refunded",
  partially_refunded: "org.orders.status.partially_refunded",
  cancelled: "org.orders.status.cancelled",
  pending: "org.orders.status.pending",
};

function statusLabel(t: Translator, status: string): string {
  const key = STATUS_LABELS[status];
  return key ? t(key) : status;
}

function formatWhen(iso: string, locale: string): string {
  return formatInTimezone(iso, "Asia/Almaty", locale);
}

/**
 * The organizer's attendee view: who bought what, and the Refund button
 * (SRS 4.9).
 *
 * Refunding is a full refund and cannot be undone, so it asks for confirmation
 * and an optional reason first rather than firing on a single click.
 */
export function OrderManager({
  eventID,
  onRefunded,
}: {
  eventID: string;
  onRefunded?: () => void;
}) {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<EventOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Which order is mid-confirmation, and what reason has been typed for it.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [refunding, setRefunding] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setOrders(await api.eventOrders(eventID, signal));
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.orders.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [eventID, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function refund(order: EventOrder) {
    setRefunding(order.id);
    try {
      const result = await api.refundOrder(order.id, reason.trim() || undefined);
      setNotice(
        t("org.orders.refundedNotice", { amount: formatKZT(result.refund.amount_kzt), name: order.buyer_name }) +
          " " +
          (result.voided_tickets === 1
            ? t("org.orders.voidOne")
            : t("org.orders.voidMany", { count: result.voided_tickets })),
      );
      setError(null);
      setConfirming(null);
      setReason("");
      await load();
      onRefunded?.();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.orders.refundFailed"));
    } finally {
      setRefunding(null);
    }
  }

  /**
   * Withdraw a free registration (SRS 4.9).
   *
   * Deliberately its own action rather than a branch inside refund(): a free
   * order has no money to give back, and sending one to the refund endpoint
   * used to trip refunds_amount_chk and surface as a 500.
   */
  async function cancel(order: EventOrder) {
    setRefunding(order.id);
    try {
      const result = await api.cancelOrder(order.id, reason.trim() || undefined);
      setNotice(
        t("org.orders.cancelledNotice", { name: order.buyer_name }) +
          " " +
          (result.cancelled_tickets === 1
            ? t("org.orders.voidOne")
            : t("org.orders.voidMany", { count: result.cancelled_tickets })),
      );
      setError(null);
      setConfirming(null);
      setReason("");
      await load();
      onRefunded?.();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : t("org.orders.cancelFailed"),
      );
    } finally {
      setRefunding(null);
    }
  }

  const refundedCount = orders.filter((o) => o.status === "refunded").length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("org.orders.heading")}</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          {loading
            ? t("org.common.loading")
            : orders.length === 0
              ? t("org.orders.none")
              : (orders.length === 1 ? t("org.analytics.orderOne") : t("org.analytics.orderMany", { count: orders.length })) +
                (refundedCount > 0 ? ` · ${t("org.analytics.refundedCount", { count: refundedCount })}` : "")}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && (
        <Alert tone="success" title={t("org.orders.refundComplete")}>
          {notice}
        </Alert>
      )}

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-surface-muted text-left text-xs font-medium text-foreground-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t("org.orders.colAttendee")}</th>
                <th className="px-4 py-2 font-medium">{t("org.orders.colOrder")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("org.analytics.tickets")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("seatCheckout.total")}</th>
                <th className="px-4 py-2 font-medium">{t("org.orders.colStatus")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("org.orders.colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-border-subtle align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{order.buyer_name}</div>
                    <div className="text-xs text-foreground-muted">{order.buyer_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{order.order_number}</div>
                    <div className="text-xs text-foreground-muted">
                      {formatWhen(order.placed_at ?? order.created_at, locale)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div>{order.live_tickets}</div>
                    {order.live_tickets !== order.ticket_count && (
                      <div className="text-xs text-foreground-muted">
                        {t("org.orders.ofIssued", { count: order.ticket_count })}
                      </div>
                    )}
                    {order.checked_in > 0 && (
                      <div className="text-xs text-foreground-muted">
                        {t("org.orders.checkedIn", { count: order.checked_in })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div>{formatKZT(order.total_kzt)}</div>
                    {order.status === "refunded" && (
                      <div className="text-xs text-danger">
                        {t("org.orders.refundedAmount", { amount: formatKZT(order.refunded_kzt) })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[order.status] ?? "bg-surface-muted text-foreground-muted"
                      }`}
                    >
                      {statusLabel(t, order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.refundable || order.cancellable ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setConfirming(order.id);
                          setReason("");
                          setNotice(null);
                        }}
                        disabled={refunding !== null}
                        data-testid={`order-action-${order.id}`}
                      >
                        {order.refundable ? t("org.orders.refund") : t("org.orders.cancelRegistration")}
                      </Button>
                    ) : (
                      <span className="text-xs text-foreground-muted">—</span>
                    )}

                    {confirming === order.id && (
                      <div className="mt-3 space-y-2 rounded-lg border border-danger/30 bg-danger-soft/30 p-3 text-left">
                        <p className="text-xs text-foreground">
                          {order.refundable ? (
                            <>
                              {t(
                                order.live_tickets === 1
                                  ? "org.orders.confirmRefundOne"
                                  : "org.orders.confirmRefundMany",
                                { amount: formatKZT(order.total_kzt), name: order.buyer_name, count: order.live_tickets },
                              )}
                            </>
                          ) : (
                            <>
                              {t(
                                order.live_tickets === 1
                                  ? "org.orders.confirmCancelOne"
                                  : "org.orders.confirmCancelMany",
                                { name: order.buyer_name, count: order.live_tickets },
                              )}
                            </>
                          )}{" "}
                          {t("org.orders.irreversible")}
                        </p>
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder={t("org.orders.reason")}
                          maxLength={500}
                          className="w-full rounded-md border border-border-subtle bg-surface px-2 py-1.5 text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirming(null)}
                            disabled={refunding === order.id}
                          >
                            {t("org.form.cancel")}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={refunding === order.id}
                            onClick={() =>
                              void (order.refundable ? refund(order) : cancel(order))
                            }
                            data-testid={`confirm-${order.id}`}
                          >
                            {order.refundable ? t("org.orders.confirmRefundButton") : t("org.orders.confirmCancelButton")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
