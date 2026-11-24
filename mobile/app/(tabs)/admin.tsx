import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Share } from "react-native";

import { ModerationAction } from "../../components/moderation-action";
import { Badge, Banner, Body, Button, Card, Empty, Field, Heading, KV, Muted, Row, Screen, Stat, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import { adminWordLabel } from "../../lib/labels";
import type { AdminSearchResponse } from "../../lib/models";
import { formatKZT } from "../../lib/money";

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

/** The administrative portal (SRS 2.1, 4.12); the API enforces the role. */
export default function AdminScreen() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const [query, setQuery] = useState("");
  const [data, setData] = useState<AdminSearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const search = useCallback(
    async (term: string) => {
      try {
        setData(await api.adminSearch(term));
        setError(null);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : t("org.attendees.searchFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => void search(query.trim()), query === "" ? 0 : 300);
    return () => clearTimeout(timer);
  }, [query, search, isAdmin]);

  const rerun = useCallback(() => void search(query.trim()), [query, search]);

  /** The CSV report, handed to the phone's share sheet (SRS 4.12). */
  async function exportReport() {
    setExporting(true);
    setExportError(null);
    try {
      const csv = await api.adminReportCSV();
      const name = `biletflow-events-${new Date().toISOString().slice(0, 10)}.csv`;
      if (Platform.OS === "web") {
        // In a browser build, save it as a file like the website does.
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = name;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: csv, title: name });
      }
    } catch {
      setExportError(t("org.admin.reportFailed"));
    } finally {
      setExporting(false);
    }
  }

  if (!isAdmin) {
    return (
      <Screen>
        <Title>{t("org.titles.admin")}</Title>
        <Banner tone="error" title={t("org.admin.deniedTitle")}>{t("org.admin.deniedBody")}</Banner>
      </Screen>
    );
  }

  const results = data?.results;
  const stats = data?.stats;

  return (
    <Screen>
      <Title>{t("org.titles.admin")}</Title>
      <Muted>{t("org.admin.subtitle")}</Muted>
      <Row>
        <Button small variant="secondary" title={t("org.titles.reports")} onPress={() => router.push("/admin/reports")} testID="reports-link" />
        <Button small variant="secondary" title={t("platformInbox.link")} onPress={() => router.push("/admin/support")} testID="support-inbox-link" />
        <Button small variant="secondary" title={t("adminTools.campaignsLink")} onPress={() => router.push("/admin/campaigns")} />
        <Button small variant="secondary" title={t("adminTools.settingsLink")} onPress={() => router.push("/admin/settings")} />
        <Button small title={t("org.admin.export")} loading={exporting} onPress={() => void exportReport()} testID="export-report" />
      </Row>
      {exportError ? <Banner tone="error">{exportError}</Banner> : null}

      {stats ? (
        <Row>
          <Stat label={t("org.admin.users")} value={String(stats.users)} />
          <Stat label={t("nav.events")} value={String(stats.events)} />
          <Stat label={t("org.admin.published")} value={String(stats.published_events)} />
          <Stat label={t("org.analytics.sold")} value={String(stats.tickets_sold)} />
          <Stat label={t("org.admin.gross")} value={formatKZT(stats.gross_revenue_kzt)} />
          <Stat label={t("org.analytics.refunded")} value={formatKZT(stats.refunded_kzt)} />
        </Row>
      ) : null}
      {stats && (stats.suspended_events > 0 || stats.failed_payments > 0 || stats.open_support_cases > 0) ? (
        <Banner title={t("org.admin.attention")}>
          {[
            stats.suspended_events > 0 && t("org.admin.suspendedEvents", { count: stats.suspended_events }),
            stats.failed_payments > 0 && t("org.admin.failedPayments", { count: stats.failed_payments }),
            stats.open_support_cases > 0 && t("org.admin.openCases", { count: stats.open_support_cases }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </Banner>
      ) : null}

      <Field label={t("org.admin.search")} value={query} onChangeText={setQuery} placeholder={t("org.admin.searchPlaceholder")} hint={loading ? t("org.attendees.searching") : t("org.admin.searchHint")} autoCapitalize="none" testID="admin-search" />
      {error ? <Banner tone="error">{error}</Banner> : null}

      {results ? (
        <>
          <Heading>{`${t("org.admin.users")} (${results.users.length})`}</Heading>
          {results.users.length === 0 ? <Empty>—</Empty> : null}
          {results.users.map((row) => (
            <Card key={row.id} testID={`admin-user-${row.email}`}>
              <Body>{row.full_name}</Body>
              <Muted>{row.email}</Muted>
              <Row>
                <Badge tone={row.status === "active" ? "success" : "muted"} text={adminWordLabel(t, row.status)} />
                {!row.email_verified ? <Badge tone="warning" text={t("org.admin.unverified")} /> : null}
              </Row>
              <Muted>
                {t("org.admin.colRoles")}: {row.roles.length > 0 ? row.roles.map((role) => adminWordLabel(t, role)).join(", ") : "—"}
              </Muted>
              <Row>
                <KV label={t("nav.events")} value={String(row.event_count)} />
                <KV label={t("org.analytics.orders")} value={String(row.order_count)} />
                <KV label={t("org.admin.colJoined")} value={formatDate(row.created_at)} />
              </Row>
              {row.id === user?.id ? (
                <Muted>{t("org.admin.you")}</Muted>
              ) : row.status === "suspended" ? (
                <ModerationAction label={t("org.admin.restore")} confirmLabel={t("org.admin.restoreConfirm")} consequence={t("org.admin.restoreConsequence")} tone="secondary" withReason={false} onConfirm={() => api.unsuspendUser(row.id)} onDone={rerun} />
              ) : (
                <ModerationAction label={t("org.admin.suspend")} confirmLabel={t("org.admin.suspendUserConfirm")} consequence={t("org.admin.suspendUserConsequence")} onConfirm={(reason) => api.suspendUser(row.id, reason)} onDone={rerun} testID={`suspend-user-${row.email}`} />
              )}
            </Card>
          ))}

          <Heading>{`${t("nav.events")} (${results.events.length})`}</Heading>
          {results.events.map((row) => (
            <Card key={row.id} testID={`admin-event-${row.slug}`}>
              <Body>{row.title}</Body>
              <Muted>
                {formatDate(row.starts_at)} · {row.organizer_email}
              </Muted>
              <Row>
                <Badge text={adminWordLabel(t, row.lifecycle)} />
                <Muted>
                  {t("org.admin.colActivation")}: {adminWordLabel(t, row.activation_status)}
                </Muted>
              </Row>
              <Row>
                <KV label={t("org.analytics.colSold")} value={String(row.tickets_sold)} />
                <KV label={t("org.analytics.revenue")} value={formatKZT(row.revenue_kzt)} />
              </Row>
              <Button small variant="ghost" title={t("org.eventCard.publicPage")} onPress={() => router.push(`/event/${row.slug}`)} />
              {row.lifecycle === "suspended" || row.status === "suspended" ? (
                <ModerationAction label={t("org.admin.lift")} confirmLabel={t("org.admin.liftConfirm")} consequence={t("org.admin.liftConsequence")} tone="secondary" withReason={false} onConfirm={() => api.unsuspendEvent(row.id)} onDone={rerun} />
              ) : (
                <ModerationAction label={t("org.admin.suspend")} confirmLabel={t("org.admin.suspendEventConfirm")} consequence={t("org.admin.suspendEventConsequence")} onConfirm={(reason) => api.suspendEvent(row.id, reason)} onDone={rerun} testID={`suspend-event-${row.slug}`} />
              )}
              {row.activation_status === "suspended" ? (
                <ModerationAction label={t("org.admin.restorePaid")} confirmLabel={t("org.admin.restorePaid")} consequence={t("org.admin.restorePaidConsequence")} tone="secondary" withReason={false} onConfirm={() => api.restorePaidSales(row.id)} onDone={rerun} />
              ) : row.activation_status === "active" ? (
                <ModerationAction label={t("org.admin.stopPaid")} confirmLabel={t("org.admin.stopPaid")} consequence={t("org.admin.stopPaidConsequence")} onConfirm={(reason) => api.suspendPaidSales(row.id, reason)} onDone={rerun} />
              ) : null}
            </Card>
          ))}

          <Heading>{`${t("org.analytics.orders")} (${results.orders.length})`}</Heading>
          {results.orders.map((row) => (
            <Card key={row.id}>
              <Body>{row.order_number}</Body>
              <Muted>
                {row.buyer_name} · {row.buyer_email}
              </Muted>
              <Muted>{row.event_title}</Muted>
              <Row>
                <Badge text={adminWordLabel(t, row.status)} />
                <KV label={t("seatCheckout.total")} value={formatKZT(row.total_kzt)} />
                <KV label={t("org.analytics.refunded")} value={row.refunded_kzt === "0.00" ? "—" : formatKZT(row.refunded_kzt)} />
              </Row>
            </Card>
          ))}

          <Heading>{`${t("org.admin.payments")} (${results.payments.length})`}</Heading>
          {results.payments.map((row) => (
            <Card key={row.id}>
              <Body>{adminWordLabel(t, row.purpose)}</Body>
              <Muted>{row.order_number ?? row.event_title ?? "—"}</Muted>
              <Row>
                <Badge text={adminWordLabel(t, row.status)} />
                {row.is_simulated ? <Muted>{t("org.activation.simulated")}</Muted> : null}
                <KV label={t("org.admin.colAmount")} value={formatKZT(row.amount_kzt)} />
                <KV label={t("org.admin.colWhen")} value={formatDate(row.created_at)} />
              </Row>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
