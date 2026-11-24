import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";

import { Banner, Body, Button, Card, Heading, KV, Loading, Muted, Row, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { formatInTimezone } from "../../../lib/datetime";
import { useT } from "../../../lib/i18n/context";
import type { BiletEvent, TicketType } from "../../../lib/models";
import { formatKZT } from "../../../lib/money";
import { radius, theme } from "../../../lib/theme";

/** How the public page will look before it is published (SRS 4.2). */
export default function PreviewScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getEvent(id), api.listTicketTypes(id)])
      .then(([loaded, list]) => {
        setEvent(loaded);
        setTypes(list);
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : t("org.detail.loadFailed")));
  }, [id, t]);

  if (!event) {
    return <Screen>{error ? <Banner tone="error">{error}</Banner> : <Loading label={t("org.detail.loading")} />}</Screen>;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("orgSettings.preview") }} />
      <Button small variant="ghost" title={t("org.form.backTo", { title: event.title })} onPress={() => router.back()} />
      <Banner title={t("orgSettings.previewTitle")}>{t("orgSettings.previewBody")}</Banner>
      {event.cover_image_url ? <Image source={{ uri: event.cover_image_url }} style={styles.banner} accessibilityLabel={event.title} /> : null}
      {event.category ? <Muted>{event.category.toUpperCase()}</Muted> : null}
      <Title>{event.title}</Title>
      <Row>
        <KV
          label={t("eventPage.when")}
          value={`${formatInTimezone(event.starts_at, event.timezone)}\n${t("eventPage.until", { time: formatInTimezone(event.ends_at, event.timezone), tz: event.timezone })}`}
        />
        {event.venue_name ? <KV label={t("eventPage.where")} value={[event.venue_name, event.venue_address].filter(Boolean).join("\n")} /> : null}
      </Row>
      {event.description ? <Body>{event.description}</Body> : null}
      <Heading>{t("tickets.heading")}</Heading>
      {types.filter((type) => !type.is_hidden).length === 0 ? (
        <Muted>{t("tickets.none")}</Muted>
      ) : (
        types
          .filter((type) => !type.is_hidden)
          .map((type) => (
            <Card key={type.id}>
              <Row>
                <Body>{type.name}</Body>
                <Body>{type.is_free ? t("tickets.free") : formatKZT(type.price_kzt)}</Body>
              </Row>
              {type.description ? <Muted>{type.description}</Muted> : null}
            </Card>
          ))
      )}
      {event.refund_policy ? (
        <>
          <Heading>{t("eventPage.refundPolicy")}</Heading>
          <Muted>{event.refund_policy}</Muted>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { width: "100%", height: 180, borderRadius: radius.md, backgroundColor: theme.surfaceAlt },
});
