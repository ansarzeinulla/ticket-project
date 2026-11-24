import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { Banner, Body, Card, Choice, Empty, Field, Loading, Muted, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { useT } from "../../../lib/i18n/context";
import type { MessageKey } from "../../../lib/i18n/dictionaries";
import { timelineActionLabel } from "../../../lib/labels";
import type { TimelineEntry } from "../../../lib/models";

const FILTERS: { label: MessageKey; prefix: string }[] = [
  { label: "org.timeline.filters.all", prefix: "" },
  { label: "org.timeline.filters.event", prefix: "event." },
  { label: "org.timeline.filters.tickets", prefix: "ticket." },
  { label: "org.timeline.filters.orders", prefix: "order." },
  { label: "org.timeline.filters.campaigns", prefix: "campaign." },
  { label: "org.timeline.filters.support", prefix: "support_case." },
];

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** The event's activity history (SRS 4.16). */
export default function TimelineScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [prefix, setPrefix] = useState("");
  const [from, setFrom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const since = /^\d{4}-\d{2}-\d{2}$/.test(from.trim()) ? from.trim() : undefined;
    try {
      setEntries(await api.eventTimeline(id, { type: prefix || undefined, from: since, limit: 200 }));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.timeline.loadFailed"));
    }
  }, [id, prefix, from, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.timeline.heading") }} />
      <Title>{t("org.timeline.heading")}</Title>
      <Muted>{t("org.timeline.subtitle")}</Muted>
      <Choice options={FILTERS.map((filter) => ({ value: filter.prefix, label: t(filter.label) }))} value={prefix} onChange={setPrefix} />
      <Field label={t("org.timeline.since")} value={from} onChangeText={setFrom} hint="YYYY-MM-DD" autoCapitalize="none" />
      {error ? <Banner tone="error">{error}</Banner> : null}
      {entries === null ? (
        <Loading label={t("org.timeline.loading")} />
      ) : entries.length === 0 ? (
        <Empty>{t("org.timeline.empty")}</Empty>
      ) : (
        entries.map((entry) => (
          <Card key={entry.id}>
            <Body>{timelineActionLabel(t, entry.action)}</Body>
            {entry.description ? <Muted>{entry.description}</Muted> : null}
            <Muted>
              {formatWhen(entry.created_at)}
              {entry.actor_name ? ` · ${t("org.timeline.by", { name: entry.actor_name })}` : ""}
            </Muted>
          </Card>
        ))
      )}
    </Screen>
  );
}
