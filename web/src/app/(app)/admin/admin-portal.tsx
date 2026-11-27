"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ModerationAction } from "@/components/moderation-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatKZT } from "@/lib/money";
import { formatDay } from "@/lib/datetime";
import { useI18n, useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { Translator } from "@/lib/i18n/translate";
import type { AdminSearchResponse } from "@/lib/types";

/** How long to wait after a keystroke before searching. */
const DEBOUNCE_MS = 300;

const WORDS: Record<string, MessageKey> = {
  pending_verification: "org.words.pending_verification",
  active: "org.words.active",
  suspended: "org.words.suspended",
  deactivated: "org.words.deactivated",
  draft: "org.words.draft",
  published: "org.words.published",
  unpublished: "org.words.unpublished",
  cancelled: "org.words.cancelled",
  completed: "org.words.completed",
  upcoming: "org.words.upcoming",
  pending: "org.words.pending",
  awaiting_payment: "org.words.awaiting_payment",
  paid: "org.words.paid",
  refunded: "org.words.refunded",
  partially_refunded: "org.words.partially_refunded",
  expired: "org.words.expired",
  failed: "org.words.failed",
  succeeded: "org.words.succeeded",
  not_started: "org.words.not_started",
  in_progress: "org.words.in_progress",
  ticket_order: "org.words.ticket_order",
  paid_sales_activation: "org.words.paid_sales_activation",
  attendee: "org.words.attendee",
  organizer: "org.words.organizer",
  event_admin: "org.words.event_admin",
  support_staff: "org.words.support_staff",
  platform_admin: "org.words.platform_admin",
};

/** A status or role in the reader's language; unknown values fall back to the raw name. */
function word(t: Translator, value: string): string {
  const key = WORDS[value];
  return key ? t(key) : value.replace(/_/g, " ");
}



/**
 * The administrative portal (SRS 2.1, 4.12).
 *
 * What is rendered here is a convenience: every one of these endpoints is
 * enforced server-side by the platform_admin role, so an account that reaches
 * this page without the role sees nothing but errors from the API. The check
 * below exists to say so plainly rather than to be the security boundary.
 */
export function AdminPortal() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;

  const [query, setQuery] = useState("");
  const [data, setData] = useState<AdminSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const search = useCallback(
    async (term: string, signal?: AbortSignal) => {
      try {
        setData(await api.adminSearch(term, signal));
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.attendees.searchFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  // Debounced: an admin typing an email should not fire eight queries.
  //
  // Nothing is fetched for a non-admin. `loading` is never read on that path -
  // the refusal below returns before it matters - so the effect simply does
  // not run rather than setting state to say so.
  useEffect(() => {
    if (!isAdmin) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void search(query.trim(), controller.signal);
    }, query === "" ? 0 : DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, search, isAdmin]);

  /**
   * Re-run the current search after a moderation action.
   *
   * A suspension changes the row that was just acted on - and the stat tiles
   * above it - so the table has to be re-read rather than patched in place,
   * which would leave the counts stale.
   */
  const rerun = useCallback(() => {
    void search(query.trim());
  }, [query, search]);

  /**
   * Download the CSV report (SRS 4.12).
   *
   * A plain <a href> cannot carry the bearer token, so the file is fetched with
   * the header attached and handed to the browser as a blob. The object URL is
   * revoked afterwards rather than leaking a reference to the whole file.
   */
  async function downloadReport() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await api.adminReportBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `biletflow-events-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t("org.admin.reportFailed"));
    } finally {
      setDownloading(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("org.titles.admin")}</h1>
        <Alert tone="error" title={t("org.admin.deniedTitle")}>
          {t("org.admin.deniedBody")}{" "}
          <Link href="/dashboard" className="font-medium underline">
            {t("org.admin.here")}
          </Link>
          .
        </Alert>
      </div>
    );
  }

  const results = data?.results;
  const stats = data?.stats;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("org.titles.admin")}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("org.admin.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/admin/reports"
              className="inline-flex items-center rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium hover:bg-surface-muted"
              data-testid="reports-link"
            >
              {t("org.titles.reports")}
            </Link>
            <Link
              href="/admin/support"
              className="inline-flex items-center rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium hover:bg-surface-muted"
              data-testid="support-inbox-link"
            >
              {t("platformInbox.link")}
            </Link>
            <Link
              href="/admin/campaigns"
              className="inline-flex items-center rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium hover:bg-surface-muted"
            >
              {t("adminTools.campaignsLink")}
            </Link>
            <Link
              href="/admin/settings"
              className="inline-flex items-center rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium hover:bg-surface-muted"
            >
              {t("adminTools.settingsLink")}
            </Link>
            <Button onClick={() => void downloadReport()} loading={downloading}>
              {t("org.admin.export")}
            </Button>
          </div>
          {downloadError && <span className="text-xs text-danger">{downloadError}</span>}
        </div>
      </header>

      {stats && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: t("org.admin.users"), value: String(stats.users) },
            { label: t("nav.events"), value: String(stats.events) },
            { label: t("org.admin.published"), value: String(stats.published_events) },
            { label: t("org.analytics.sold"), value: String(stats.tickets_sold) },
            { label: t("org.admin.gross"), value: formatKZT(stats.gross_revenue_kzt) },
            { label: t("org.analytics.refunded"), value: formatKZT(stats.refunded_kzt) },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-lg border border-border-subtle bg-surface p-3"
            >
              <p className="text-xs text-foreground-muted">{tile.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{tile.value}</p>
            </div>
          ))}
        </section>
      )}

      {stats && (stats.suspended_events > 0 || stats.failed_payments > 0 ||
        stats.open_support_cases > 0) && (
        <Alert tone="info" title={t("org.admin.attention")}>
          {[
            stats.suspended_events > 0 && t("org.admin.suspendedEvents", { count: stats.suspended_events }),
            stats.failed_payments > 0 && t("org.admin.failedPayments", { count: stats.failed_payments }),
            stats.open_support_cases > 0 && t("org.admin.openCases", { count: stats.open_support_cases }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Alert>
      )}

      <div>
        <label htmlFor="admin-search" className="block text-sm font-medium">
          {t("org.admin.search")}
        </label>
        <input
          id="admin-search"
          type="search"
          value={query}
          placeholder={t("org.admin.searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-foreground-muted">
          {loading ? t("org.attendees.searching") : t("org.admin.searchHint")}
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {results && (
        <div className="space-y-8">
          <Section title={t("org.admin.users")} count={results.users.length}>
            <Table
              columns={[
                t("org.admin.colAccount"),
                t("org.orders.colStatus"),
                t("org.admin.colRoles"),
                t("nav.events"),
                t("org.analytics.orders"),
                t("org.admin.colJoined"),
                t("org.orders.colAction"),
              ]}
            >
              {results.users.map((row) => (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2">
                    <div className="font-medium">{row.full_name}</div>
                    <div className="text-xs text-foreground-muted">{row.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Pill value={row.status} />
                    {!row.email_verified && (
                      <span className="ml-2 text-xs text-warning">{t("org.admin.unverified")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {row.roles.length > 0 ? row.roles.map((role) => word(t, role)).join(", ") : "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{row.event_count}</td>
                  <td className="px-4 py-2 tabular-nums">{row.order_count}</td>
                  <td className="px-4 py-2 text-xs">{formatDay(row.created_at, locale)}</td>
                  <td className="px-4 py-2">
                    {row.id === user?.id ? (
                      <span className="text-xs text-foreground-muted">{t("org.admin.you")}</span>
                    ) : row.status === "suspended" ? (
                      <ModerationAction
                        label={t("org.admin.restore")}
                        confirmLabel={t("org.admin.restoreConfirm")}
                        consequence={t("org.admin.restoreConsequence")}
                        tone="secondary"
                        withReason={false}
                        onConfirm={() => api.unsuspendUser(row.id)}
                        onDone={rerun}
                      />
                    ) : (
                      <ModerationAction
                        label={t("org.admin.suspend")}
                        confirmLabel={t("org.admin.suspendUserConfirm")}
                        consequence={t("org.admin.suspendUserConsequence")}
                        onConfirm={(reason) => api.suspendUser(row.id, reason)}
                        onDone={rerun}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Section>

          <Section title={t("nav.events")} count={results.events.length}>
            <Table
              columns={[
                t("org.admin.colEvent"),
                t("org.admin.colOrganizer"),
                t("org.admin.colStage"),
                t("org.admin.colActivation"),
                t("org.analytics.colSold"),
                t("org.analytics.revenue"),
                t("org.orders.colAction"),
              ]}
            >
              {results.events.map((row) => (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2">
                    {/* Only a published event has a public page to open. */}
                    {row.status === "published" ? (
                      <Link href={`/events/${row.slug}`} className="font-medium text-brand hover:underline">
                        {row.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.title}</span>
                    )}
                    <div className="text-xs text-foreground-muted">{formatDay(row.starts_at, locale)}</div>
                    {/* Every event, drafts included, opens in the organizer preview (BF-100). */}
                    <Link
                      href={`/dashboard/events/${row.id}/preview`}
                      className="text-xs font-medium text-brand hover:underline"
                      data-testid={`admin-view-${row.slug}`}
                    >
                      {t("org.admin.view")}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs">{row.organizer_email}</td>
                  <td className="px-4 py-2">
                    <Pill value={row.lifecycle} />
                  </td>
                  <td className="px-4 py-2 text-xs">{word(t, row.activation_status)}</td>
                  <td className="px-4 py-2 tabular-nums">{row.tickets_sold}</td>
                  <td className="px-4 py-2 tabular-nums">{formatKZT(row.revenue_kzt)}</td>
                  <td className="px-4 py-2">
                    <div className="space-y-2">
                      {row.lifecycle === "suspended" || row.status === "suspended" ? (
                        <ModerationAction
                          label={t("org.admin.lift")}
                          confirmLabel={t("org.admin.liftConfirm")}
                          consequence={t("org.admin.liftConsequence")}
                          tone="secondary"
                          withReason={false}
                          onConfirm={() => api.unsuspendEvent(row.id)}
                          onDone={rerun}
                        />
                      ) : (
                        <ModerationAction
                          label={t("org.admin.suspend")}
                          confirmLabel={t("org.admin.suspendEventConfirm")}
                          consequence={t("org.admin.suspendEventConsequence")}
                          onConfirm={(reason) => api.suspendEvent(row.id, reason)}
                          onDone={rerun}
                        />
                      )}

                      {row.activation_status === "suspended" ? (
                        <ModerationAction
                          label={t("org.admin.restorePaid")}
                          confirmLabel={t("org.admin.restorePaid")}
                          consequence={t("org.admin.restorePaidConsequence")}
                          tone="secondary"
                          withReason={false}
                          onConfirm={() => api.restorePaidSales(row.id)}
                          onDone={rerun}
                        />
                      ) : row.activation_status === "active" ? (
                        <ModerationAction
                          label={t("org.admin.stopPaid")}
                          confirmLabel={t("org.admin.stopPaid")}
                          consequence={t("org.admin.stopPaidConsequence")}
                          onConfirm={(reason) => api.suspendPaidSales(row.id, reason)}
                          onDone={rerun}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          </Section>

          <Section title={t("org.analytics.orders")} count={results.orders.length}>
            <Table
              columns={[
                t("org.orders.colOrder"),
                t("org.admin.colBuyer"),
                t("org.admin.colEvent"),
                t("org.orders.colStatus"),
                t("seatCheckout.total"),
                t("org.analytics.refunded"),
              ]}
            >
              {results.orders.map((row) => (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2 font-mono text-xs">{row.order_number}</td>
                  <td className="px-4 py-2">
                    <div>{row.buyer_name}</div>
                    <div className="text-xs text-foreground-muted">{row.buyer_email}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{row.event_title}</td>
                  <td className="px-4 py-2">
                    <Pill value={row.status} />
                  </td>
                  <td className="px-4 py-2 tabular-nums">{formatKZT(row.total_kzt)}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {row.refunded_kzt === "0.00" ? "—" : formatKZT(row.refunded_kzt)}
                  </td>
                </tr>
              ))}
            </Table>
          </Section>

          <Section title={t("org.admin.payments")} count={results.payments.length}>
            <Table
              columns={[
                t("org.admin.colPurpose"),
                t("org.admin.colReference"),
                t("org.orders.colStatus"),
                t("org.admin.colAmount"),
                t("org.admin.colWhen"),
              ]}
            >
              {results.payments.map((row) => (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2 text-xs">{word(t, row.purpose)}</td>
                  <td className="px-4 py-2 text-xs">
                    {row.order_number ?? row.event_title ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Pill value={row.status} />
                    {row.is_simulated && (
                      <span className="ml-2 text-xs text-foreground-muted">{t("org.activation.simulated")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{formatKZT(row.amount_kzt)}</td>
                  <td className="px-4 py-2 text-xs">{formatDay(row.created_at, locale)}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </div>
      )}
    </div>
  );
}

/**
 * A neutral status pill.
 *
 * The portal shows four different kinds of status - account, lifecycle, order,
 * payment - and StatusBadge is deliberately typed to event statuses alone.
 * Widening it to `string` to serve this page would throw away the type safety
 * it gives everywhere else, so the portal carries its own.
 */
const PILL_TONES: Record<string, string> = {
  active: "bg-success-soft text-success",
  published: "bg-success-soft text-success",
  paid: "bg-success-soft text-success",
  completed: "bg-success-soft text-success",
  succeeded: "bg-success-soft text-success",
  upcoming: "bg-brand/10 text-brand-strong",
  in_progress: "bg-brand/10 text-brand-strong",
  pending_verification: "bg-warning-soft text-warning",
  pending: "bg-warning-soft text-warning",
  partially_refunded: "bg-warning-soft text-warning",
  suspended: "bg-danger-soft text-danger",
  cancelled: "bg-danger-soft text-danger",
  refunded: "bg-danger-soft text-danger",
  failed: "bg-danger-soft text-danger",
};

function Pill({ value }: { value: string }) {
  const t = useT();
  const tone = PILL_TONES[value] ?? "bg-surface-muted text-foreground-muted";
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
      {word(t, value)}
    </span>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <section>
      <h2 className="text-base font-semibold">
        {title} <span className="ml-1 font-normal">({count})</span>
      </h2>
      <div className="mt-2">
        {count === 0 ? (
          <p className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-foreground-muted">
            {t("org.admin.nothing")}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Table({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="bg-surface-muted text-left text-xs font-medium text-foreground-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
