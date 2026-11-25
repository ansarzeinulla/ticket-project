"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { EventCard } from "@/components/event-card";
import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { BiletEvent, Lifecycle } from "@/lib/types";

/** The groupings SRS 4.16 asks the organizer's history to offer. */
const LIFECYCLE_TABS: { label: MessageKey; empty: MessageKey; value: Lifecycle | "" }[] = [
  { label: "org.dashboard.tabs.all", empty: "org.dashboard.empty.all", value: "" },
  { label: "org.dashboard.tabs.upcoming", empty: "org.dashboard.empty.upcoming", value: "upcoming" },
  { label: "org.dashboard.tabs.active", empty: "org.dashboard.empty.active", value: "active" },
  { label: "org.dashboard.tabs.completed", empty: "org.dashboard.empty.completed", value: "completed" },
  { label: "org.dashboard.tabs.cancelled", empty: "org.dashboard.empty.cancelled", value: "cancelled" },
  { label: "org.dashboard.tabs.drafts", empty: "org.dashboard.empty.drafts", value: "draft" },
];

export default function DashboardPage() {
  const t = useT();
  const [events, setEvents] = useState<BiletEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle | "">("");

  /**
   * Fetches the organizer's own events. Every state update happens after the
   * await, so calling this from an effect cannot cascade renders.
   */
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.listMyEvents(
        { limit: 100, ...(lifecycle ? { lifecycle } : {}) },
        signal,
      );
      setEvents(data.events);
      setTotal(data.total);
      setError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof ApiError ? cause.message : t("org.dashboard.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [lifecycle, t]);

  useEffect(() => {
    const controller = new AbortController();
    // The rule cannot see through the call into `load`, where every setState
    // now happens after the await. Nothing here updates state synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** The Refresh button owns its own spinner state, unlike the initial load. */
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    void load();
  }, [load]);

  /** Swap one event in place after a publish or cancel. */
  const handleChanged = useCallback((updated: BiletEvent) => {
    setEvents((current) =>
      current.map((event) => (event.id === updated.id ? updated : event)),
    );
  }, []);

  const counts = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.status] = (acc[event.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("org.dashboard.heading")}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {loading
              ? t("org.common.loading")
              : (total === 1 ? t("org.dashboard.countOne") : t("org.dashboard.countMany", { count: total })) +
                (counts.draft ? ` · ${t("org.dashboard.drafts", { count: counts.draft })}` : "") +
                (counts.published ? ` · ${t("org.dashboard.published", { count: counts.published })}` : "")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
            {t("org.common.refresh")}
          </Button>
          <Link
            href="/events/new"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            {t("org.dashboard.newEvent")}
          </Link>
        </div>
      </div>

      <div className="scroll-row flex gap-6 overflow-x-auto border-b border-border-subtle" role="group" aria-label={t("org.dashboard.filter")}>
        {LIFECYCLE_TABS.map((tab) => {
          const on = lifecycle === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setLoading(true);
                setLifecycle(tab.value);
              }}
              className={`relative shrink-0 whitespace-nowrap pb-3 text-sm transition-colors ${
                on
                  ? "font-semibold after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand"
                  : "text-foreground-muted hover:text-foreground"
              }`}
              data-testid={`filter-${tab.value || "all"}`}
            >
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {error && (
        <Alert tone="error" title={t("org.dashboard.loadFailedTitle")}>
          {error}
        </Alert>
      )}

      {loading && events.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-surface p-8 ring-1 ring-border-subtle text-sm text-foreground-muted">
          <Spinner />
          {t("org.dashboard.fetching")}
        </div>
      ) : events.length === 0 && !error && lifecycle ? (
        <p className="rounded-lg bg-surface ring-1 ring-border-subtle p-10 text-center text-sm text-foreground-muted">
          {t(LIFECYCLE_TABS.find((tab) => tab.value === lifecycle)?.empty ?? "org.dashboard.empty.all")}
        </p>
      ) : events.length === 0 && !error ? (
        <div className="rounded-lg bg-surface ring-1 ring-border-subtle p-12 text-center">
          <h2 className="text-base font-semibold">{t("org.dashboard.noneHeading")}</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-foreground-muted">
            {t("org.dashboard.noneBody")}
          </p>
          <Link
            href="/events/new"
            className="mt-5 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            {t("org.dashboard.createFirst")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onChanged={handleChanged} />
          ))}
        </ul>
      )}
    </div>
  );
}
