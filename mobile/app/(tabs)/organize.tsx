import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { SignInPrompt } from "../../components/sign-in-prompt";
import { Badge, Banner, Body, Button, Card, Choice, Empty, Loading, Muted, Row, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { formatInTimezone } from "../../lib/datetime";
import { useT } from "../../lib/i18n/context";
import type { MessageKey } from "../../lib/i18n/dictionaries";
import { eventStatusLabel, lifecycleLabel } from "../../lib/labels";
import type { BiletEvent } from "../../lib/models";

type Tab = "" | "upcoming" | "active" | "completed" | "cancelled" | "draft";
const TABS: { value: Tab; label: MessageKey }[] = [
  { value: "", label: "org.dashboard.tabs.all" },
  { value: "upcoming", label: "org.dashboard.tabs.upcoming" },
  { value: "active", label: "org.dashboard.tabs.active" },
  { value: "completed", label: "org.dashboard.tabs.completed" },
  { value: "cancelled", label: "org.dashboard.tabs.cancelled" },
  { value: "draft", label: "org.dashboard.tabs.drafts" },
];

/** The organizer dashboard: the organizer's events, grouped by lifecycle (SRS 4.16). */
export default function OrganizeScreen() {
  const t = useT();
  const { status } = useAuth();
  const [events, setEvents] = useState<BiletEvent[] | null>(null);
  const [lifecycle, setLifecycle] = useState<Tab>("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listMyEvents({ limit: 100, ...(lifecycle ? { lifecycle } : {}) });
      setEvents(data.events);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.dashboard.loadFailed"));
    } finally {
      setRefreshing(false);
    }
  }, [lifecycle, t]);

  useFocusEffect(
    useCallback(() => {
      if (status === "signedIn") void load();
    }, [status, load]),
  );

  if (status !== "signedIn") {
    return (
      <Screen>
        <Title>{t("org.dashboard.heading")}</Title>
        <SignInPrompt message={t("org.dashboard.noneBody")} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}>
      <Title>{t("org.dashboard.heading")}</Title>
      <Row>
        <Button title={t("org.dashboard.newEvent")} onPress={() => router.push("/event-form")} testID="new-event" />
        <Button variant="secondary" title={t("platformSupport.link")} onPress={() => router.push("/platform-support")} />
      </Row>
      <Choice<Tab>
        options={TABS.map((tab) => ({ value: tab.value, label: t(tab.label) }))}
        value={lifecycle}
        onChange={(value) => {
          setEvents(null);
          setLifecycle(value);
        }}
      />
      {error ? <Banner tone="error" title={t("org.dashboard.loadFailedTitle")}>{error}</Banner> : null}
      {events === null ? (
        <Loading label={t("org.dashboard.fetching")} />
      ) : events.length === 0 ? (
        <Empty>{lifecycle ? t(`org.dashboard.empty.${lifecycle === "draft" ? "drafts" : lifecycle}` as MessageKey) : t("org.dashboard.noneBody")}</Empty>
      ) : (
        events.map((event) => (
          <Card key={event.id} onPress={() => router.push(`/manage/${event.id}`)} testID={`manage-${event.slug}`}>
            <Body>{event.title}</Body>
            <Row>
              <Badge text={eventStatusLabel(t, event.status)} />
              <Badge tone="muted" text={lifecycleLabel(t, event.lifecycle)} />
            </Row>
            <Muted>{formatInTimezone(event.starts_at, event.timezone)}</Muted>
            <Muted>/{event.slug}</Muted>
          </Card>
        ))
      )}
    </Screen>
  );
}
