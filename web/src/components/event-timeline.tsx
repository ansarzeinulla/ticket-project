"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { Translator } from "@/lib/i18n/translate";
import type { TimelineEntry } from "@/lib/types";

/** Activity groups the filter offers, keyed by the action prefix. */
const ACTIVITY_FILTERS = [
  { label: "org.timeline.filters.all", prefix: "" },
  { label: "org.timeline.filters.event", prefix: "event." },
  { label: "org.timeline.filters.tickets", prefix: "ticket." },
  { label: "org.timeline.filters.orders", prefix: "order." },
  { label: "org.timeline.filters.campaigns", prefix: "campaign." },
  { label: "org.timeline.filters.support", prefix: "support_case." },
] as const satisfies readonly { label: MessageKey; prefix: string }[];

/** Human wording for the actions the system records. */
const ACTION_LABELS: Record<string, MessageKey> = {
  "event.created": "org.timeline.actions.event__created",
  "event.updated": "org.timeline.actions.event__updated",
  "event.published": "org.timeline.actions.event__published",
  "event.unpublished": "org.timeline.actions.event__unpublished",
  "event.cancelled": "org.timeline.actions.event__cancelled",
  "event.suspended": "org.timeline.actions.event__suspended",
  "event.unsuspended": "org.timeline.actions.event__unsuspended",
  "event.deleted": "org.timeline.actions.event__deleted",
  "event.duplicated": "org.timeline.actions.event__duplicated",
  "event.duplicated_from": "org.timeline.actions.event__duplicated_from",
  "ticket_type.created": "org.timeline.actions.ticket_type__created",
  "ticket_type.updated": "org.timeline.actions.ticket_type__updated",
  "ticket_type.deleted": "org.timeline.actions.ticket_type__deleted",
  "order.created": "org.timeline.actions.order__created",
  "ticket.checked_in": "org.timeline.actions.ticket__checked_in",
  "ticket.check_in_reversed": "org.timeline.actions.ticket__check_in_reversed",
  "campaign.created": "org.timeline.actions.campaign__created",
  "campaign.active": "org.timeline.actions.campaign__active",
  "campaign.disabled": "org.timeline.actions.campaign__disabled",
  "campaign.deleted": "org.timeline.actions.campaign__deleted",
  "staff.assigned": "org.timeline.actions.staff__assigned",
  "staff.revoked": "org.timeline.actions.staff__revoked",
  "support_case.opened": "org.timeline.actions.support_case__opened",
  "support_case.resolved": "org.timeline.actions.support_case__resolved",
  "support_case.in_progress": "org.timeline.actions.support_case__in_progress",
  "support_case.waiting_for_customer": "org.timeline.actions.support_case__waiting_for_customer",
  "support_case.open": "org.timeline.actions.support_case__open",
  "paid_sales.activated": "org.timeline.actions.paid_sales__activated",
  "event.activation_updated": "org.timeline.actions.event__activation_updated",
  "event.paid_sales_activated": "org.timeline.actions.event__paid_sales_activated",
  "event.paid_sales_suspended": "org.timeline.actions.event__paid_sales_suspended",
  "event.paid_sales_unsuspended": "org.timeline.actions.event__paid_sales_unsuspended",
  "event.report_reviewed": "org.timeline.actions.event__report_reviewed",
  "order.cancelled": "org.timeline.actions.order__cancelled",
  "order.confirmation": "org.timeline.actions.order__confirmation",
  "order.refunded": "org.timeline.actions.order__refunded",
  "refund.completed": "org.timeline.actions.refund__completed",
  "support_case.assigned": "org.timeline.actions.support_case__assigned",
  "support_case.unassigned": "org.timeline.actions.support_case__unassigned",
};

function actionLabel(t: Translator, action: string): string {
  const key = ACTION_LABELS[action];
  return key ? t(key) : action.replace(/[._]/g, " ");
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** The event's chronological activity history (SRS 4.16). */
export function EventTimeline({ eventID }: { eventID: string }) {
  const t = useT();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [prefix, setPrefix] = useState("");
  const [from, setFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setEntries(
          await api.eventTimeline(
            eventID,
            { type: prefix || undefined, from: from || undefined, limit: 200 },
            signal,
          ),
        );
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.timeline.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [eventID, prefix, from, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("org.timeline.heading")}</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          {t("org.timeline.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1">
          {ACTIVITY_FILTERS.map((filter) => (
            <Button
              key={filter.label}
              size="sm"
              variant={prefix === filter.prefix ? "primary" : "secondary"}
              onClick={() => setPrefix(filter.prefix)}
            >
              {t(filter.label)}
            </Button>
          ))}
        </div>
        <div className="space-y-1">
          <label htmlFor="timeline-from" className="block text-xs text-foreground-muted">
            {t("org.timeline.since")}
          </label>
          <input
            id="timeline-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading && entries.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-6 text-sm text-foreground-muted">
          <Spinner />
          {t("org.timeline.loading")}
        </div>
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle bg-surface p-6 text-center text-sm text-foreground-muted">
          {t("org.timeline.empty")}
        </p>
      ) : (
        <ol className="space-y-1 rounded-xl border border-border-subtle bg-surface p-2" data-testid="timeline">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg px-3 py-2 hover:bg-surface-muted/60"
            >
              <span className="w-40 shrink-0 text-xs text-foreground-muted tabular-nums">
                {formatWhen(entry.created_at)}
              </span>
              <span className="font-medium">{actionLabel(t, entry.action)}</span>
              {entry.description && (
                <span className="text-sm text-foreground-muted">{entry.description}</span>
              )}
              {entry.actor_name && (
                <span className="ml-auto text-xs text-foreground-muted">
                  {t("org.timeline.by", { name: entry.actor_name })}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
