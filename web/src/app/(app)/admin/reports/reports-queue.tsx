"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ModerationAction } from "@/components/moderation-action";
import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { EventReport, ReportStatus } from "@/lib/types";

const FILTERS: { value: string; label: MessageKey }[] = [
  { value: "open", label: "org.reports.filters.open" },
  { value: "reviewing", label: "org.reports.filters.reviewing" },
  { value: "upheld", label: "org.reports.filters.upheld" },
  { value: "dismissed", label: "org.reports.filters.dismissed" },
  { value: "", label: "org.timeline.filters.all" },
];

const REASON_LABELS: Record<string, MessageKey> = {
  fraud: "org.reports.reasons.fraud",
  misleading: "org.reports.reasons.misleading",
  inappropriate: "org.reports.reasons.inappropriate",
  spam: "org.reports.reasons.spam",
  copyright: "org.reports.reasons.copyright",
  other: "org.reports.reasons.other",
};

const STATUS_LABELS: Record<ReportStatus, MessageKey> = {
  open: "org.reports.status.open",
  reviewing: "org.reports.status.reviewing",
  upheld: "org.reports.status.upheld",
  dismissed: "org.reports.status.dismissed",
};

const STATUS_TONES: Record<ReportStatus, string> = {
  open: "bg-warning-soft text-warning",
  reviewing: "bg-brand/10 text-brand",
  upheld: "bg-danger-soft text-danger",
  dismissed: "bg-surface-muted text-foreground-muted",
};

/**
 * The moderation queue (SRS 4.12: "Review reported events").
 *
 * Deciding a report and suspending an event are deliberately two actions.
 * Upholding a complaint says "this was justified"; whether that warrants
 * taking the event down is a second, explicit choice — one report of
 * "misleading" against a hundred happy attendees is not the same call as a
 * fraud complaint, and collapsing the two would make the queue a trigger
 * rather than a review.
 */
export function ReportsQueue() {
  const { user } = useAuth();
  const t = useT();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;

  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState<EventReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (filter: string, signal?: AbortSignal) => {
      try {
        const data = await api.listEventReports(filter || undefined, signal);
        setReports(data.reports);
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.reports.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(status, controller.signal);
    return () => controller.abort();
  }, [status, load, isAdmin]);

  if (!isAdmin) {
    return (
      <Alert tone="error" title={t("org.reports.deniedTitle")}>
        {t("org.reports.deniedBody")}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-foreground-muted hover:underline">
            {t("org.reports.back")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{t("org.titles.reports")}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("org.reports.subtitle")}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load(status)}>
          {t("org.common.refresh")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => setStatus(filter.value)}
            aria-pressed={status === filter.value}
            data-testid={`report-filter-${filter.value || "all"}`}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              status === filter.value
                ? "bg-brand text-white"
                : "border border-border-subtle hover:bg-surface-muted"
            }`}
          >
            {t(filter.label)}
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-foreground-muted">
          <Spinner aria-hidden /> {t("org.common.loading")}
        </p>
      ) : reports.length === 0 ? (
        <p
          className="rounded-xl border border-dashed border-border-subtle px-6 py-12 text-center text-sm text-foreground-muted"
          data-testid="queue-empty"
        >
          {t("org.reports.nothing")} {status === "open" ? t("org.reports.noneOpen") : t("org.reports.noneMatch")}
        </p>
      ) : (
        <ul className="space-y-4" data-testid="report-queue">
          {reports.map((report) => (
            <li
              key={report.id}
              className="rounded-xl border border-border-subtle bg-surface p-5"
              data-testid={`report-${report.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/events/${report.event_slug}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {report.event_title}
                    </Link>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_TONES[report.status]}`}
                    >
                      {t(STATUS_LABELS[report.status])}
                    </span>
                    <span className="rounded bg-surface-muted px-2 py-0.5 text-xs">
                      {REASON_LABELS[report.reason] ? t(REASON_LABELS[report.reason]) : report.reason}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {t("org.reports.organizer", { email: report.organizer_email })}
                    {report.reporter_email && ` · ${t("org.reports.reportedBy", { email: report.reporter_email })}`}
                  </p>
                </div>
                <time className="text-xs text-foreground-muted">
                  {new Date(report.created_at).toLocaleDateString()}
                </time>
              </div>

              {report.details && (
                <blockquote className="mt-3 border-l-2 border-border-subtle pl-3 text-sm text-foreground-muted">
                  {report.details}
                </blockquote>
              )}

              {report.resolution && (
                <p className="mt-3 text-sm">
                  <span className="text-foreground-muted">{t("org.reports.resolution")} </span>
                  {report.resolution}
                </p>
              )}

              {(report.status === "open" || report.status === "reviewing") && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <ModerationAction
                    label={t("org.reports.uphold")}
                    confirmLabel={t("org.reports.upholdConfirm")}
                    consequence={t("org.reports.upholdConsequence")}
                    onConfirm={(reason) =>
                      api.reviewEventReport(report.id, "upheld", reason)
                    }
                    onDone={() => void load(status)}
                  />
                  <ModerationAction
                    label={t("org.reports.dismiss")}
                    confirmLabel={t("org.reports.dismissConfirm")}
                    consequence={t("org.reports.dismissConsequence")}
                    tone="secondary"
                    onConfirm={(reason) =>
                      api.reviewEventReport(report.id, "dismissed", reason)
                    }
                    onDone={() => void load(status)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
