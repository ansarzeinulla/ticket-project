import { Stack, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { ModerationAction } from "../../components/moderation-action";
import { Badge, Banner, Body, Button, Card, Choice, Empty, Loading, Muted, Row, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import type { MessageKey } from "../../lib/i18n/dictionaries";
import { reportReasonLabel, reportStatusLabel } from "../../lib/labels";
import type { EventReport } from "../../lib/models";

const FILTERS: { value: string; label: MessageKey }[] = [
  { value: "open", label: "org.reports.filters.open" },
  { value: "reviewing", label: "org.reports.filters.reviewing" },
  { value: "upheld", label: "org.reports.filters.upheld" },
  { value: "dismissed", label: "org.reports.filters.dismissed" },
  { value: "", label: "org.timeline.filters.all" },
];

/** Reports about events, to uphold or dismiss (SRS 4.12). */
export default function ReportsScreen() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState<EventReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReports((await api.listEventReports(status || undefined)).reports);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.reports.loadFailed"));
    }
  }, [status, t]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <Screen>
        <Banner tone="error" title={t("org.reports.deniedTitle")}>{t("org.reports.deniedBody")}</Banner>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.titles.reports") }} />
      <Title>{t("org.titles.reports")}</Title>
      <Muted>{t("org.reports.subtitle")}</Muted>
      <Choice options={FILTERS.map((filter) => ({ value: filter.value, label: t(filter.label) }))} value={status} onChange={(value) => { setReports(null); setStatus(value); }} />
      <Button small variant="secondary" title={t("org.common.refresh")} onPress={() => void load()} />
      {error ? <Banner tone="error">{error}</Banner> : null}
      {reports === null ? (
        <Loading label={t("org.common.loading")} />
      ) : reports.length === 0 ? (
        <Empty>{`${t("org.reports.nothing")} ${status === "open" ? t("org.reports.noneOpen") : t("org.reports.noneMatch")}`}</Empty>
      ) : (
        reports.map((report) => (
          <Card key={report.id} testID={`report-${report.id}`}>
            <Button small variant="ghost" title={report.event_title} onPress={() => router.push(`/event/${report.event_slug}`)} />
            <Row>
              <Badge text={reportStatusLabel(t, report.status)} />
              <Muted>{reportReasonLabel(t, report.reason)}</Muted>
              <Muted>{new Date(report.created_at).toLocaleDateString()}</Muted>
            </Row>
            <Muted>
              {t("org.reports.organizer", { email: report.organizer_email })}
              {report.reporter_email ? ` · ${t("org.reports.reportedBy", { email: report.reporter_email })}` : ""}
            </Muted>
            {report.details ? <Body>{report.details}</Body> : null}
            {report.resolution ? <Muted>{`${t("org.reports.resolution")} ${report.resolution}`}</Muted> : null}
            {report.status === "open" || report.status === "reviewing" ? (
              <Row>
                <ModerationAction label={t("org.reports.uphold")} confirmLabel={t("org.reports.upholdConfirm")} consequence={t("org.reports.upholdConsequence")} onConfirm={(reason) => api.reviewEventReport(report.id, "upheld", reason)} onDone={() => void load()} />
                <ModerationAction label={t("org.reports.dismiss")} confirmLabel={t("org.reports.dismissConfirm")} consequence={t("org.reports.dismissConsequence")} tone="secondary" onConfirm={(reason) => api.reviewEventReport(report.id, "dismissed", reason)} onDone={() => void load()} />
              </Row>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
