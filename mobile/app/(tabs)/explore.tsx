import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";

import { Banner, Body, Button, Card, Empty, Loading, Muted, Row, Screen, Title } from "../../components/ui";
import { ApiError, api } from "../../lib/client";
import { formatInTimezone } from "../../lib/datetime";
import { useT } from "../../lib/i18n/context";
import type { BiletEvent } from "../../lib/models";
import { radius, theme } from "../../lib/theme";

const PAGE = 20;

/** The public catalogue, soonest first - the website's /events. */
export default function ExploreScreen() {
  const t = useT();
  const [events, setEvents] = useState<BiletEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (from: number) => {
    try {
      const data = await api.listPublicEvents({ limit: PAGE, offset: from });
      setEvents(data.events);
      setTotal(data.total);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("catalogue.unavailable"));
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void load(offset);
  }, [load, offset]);

  const page = Math.floor(offset / PAGE) + 1;
  const last = Math.max(1, Math.ceil(total / PAGE));

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(offset); }}>
      <Title>{t("catalogue.title")}</Title>
      <Muted>{t("catalogue.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {events === null ? (
        !error && <Loading />
      ) : events.length === 0 ? (
        <Empty>{offset === 0 ? t("catalogue.emptyFirst") : t("catalogue.emptyMore")}</Empty>
      ) : (
        events.map((event) => (
          <Card key={event.id} onPress={() => router.push(`/event/${event.slug}`)} testID={`event-${event.slug}`}>
            {event.cover_image_url ? (
              <Image source={{ uri: event.cover_image_url }} style={styles.banner} accessibilityIgnoresInvertColors />
            ) : null}
            {event.category ? <Muted style={styles.category}>{event.category.toUpperCase()}</Muted> : null}
            <Body style={styles.title}>{event.title}</Body>
            <Muted>{formatInTimezone(event.starts_at, event.timezone)}</Muted>
            {event.venue_name ? <Muted>{event.venue_name}</Muted> : null}
          </Card>
        ))
      )}
      {total > PAGE ? (
        <Row>
          <Button small variant="secondary" title={t("catalogue.earlier")} disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE))} />
          <Muted>{t("catalogue.pageInfo", { page, last, total, events: total === 1 ? t("catalogue.eventOne") : t("catalogue.eventMany") })}</Muted>
          <Button small variant="secondary" title={t("catalogue.later")} disabled={page >= last} onPress={() => setOffset(offset + PAGE)} />
        </Row>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { width: "100%", height: 140, borderRadius: radius.sm, backgroundColor: theme.surfaceAlt },
  category: { color: theme.brand, fontWeight: "600" },
  title: { fontSize: 17, fontWeight: "600" },
});
