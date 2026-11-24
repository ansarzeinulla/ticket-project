import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";

import { CalendarLinks } from "../../components/calendar-links";
import { SeatedCheckout } from "../../components/seated-checkout";
import { TicketCheckout } from "../../components/ticket-checkout";
import { Banner, Body, Heading, KV, Loading, Muted, Row, Screen, Title } from "../../components/ui";
import { ApiError, api } from "../../lib/client";
import { formatInTimezone } from "../../lib/datetime";
import { useT } from "../../lib/i18n/context";
import type { PublicEventResponse } from "../../lib/models";
import { radius, theme } from "../../lib/theme";

/**
 * The public event page: details, calendar links, and tickets - general
 * admission or the seat map. A campaign QR arrives as ?c=CMP_..., and only
 * that opaque token travels; the server decides what it is worth.
 */
export default function EventScreen() {
  const t = useT();
  const { slug, c } = useLocalSearchParams<{ slug: string; c?: string }>();
  const campaignToken = typeof c === "string" && c.startsWith("CMP_") ? c : undefined;
  const [data, setData] = useState<PublicEventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.getPublicEvent(slug));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("catalogue.unavailable"));
    }
  }, [slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "" }} />
        {error ? <Banner tone="error">{error}</Banner> : <Loading />}
      </Screen>
    );
  }

  const { event, ticket_types: ticketTypes, suspended } = data;
  const paidSalesPending = data.paid_sales_required && !data.paid_sales_active && !suspended;
  const hasFreeTier = ticketTypes.some((type) => type.is_free);

  return (
    <Screen>
      <Stack.Screen options={{ title: event.title }} />
      {event.cover_image_url ? (
        <Image source={{ uri: event.cover_image_url }} style={styles.banner} accessibilityLabel={event.title} />
      ) : null}
      {event.category ? <Muted style={styles.category}>{event.category.toUpperCase()}</Muted> : null}
      <Title>{event.title}</Title>
      <Row>
        <KV
          label={t("eventPage.when")}
          value={
            <>
              <Body>{formatInTimezone(event.starts_at, event.timezone)}</Body>
              <Muted>{t("eventPage.until", { time: formatInTimezone(event.ends_at, event.timezone), tz: event.timezone })}</Muted>
            </>
          }
        />
        {event.venue_name ? (
          <KV
            label={t("eventPage.where")}
            value={
              <>
                <Body>{event.venue_name}</Body>
                {event.venue_address ? <Muted>{event.venue_address}</Muted> : null}
              </>
            }
          />
        ) : null}
      </Row>
      <CalendarLinks event={event} />

      {suspended ? <Banner tone="error" title={t("eventPage.suspendedTitle")}>{t("eventPage.suspendedBody")}</Banner> : null}
      {paidSalesPending ? (
        <Banner tone="warning" title={t("eventPage.paidPendingTitle")}>
          {t("eventPage.paidPendingBody") + (hasFreeTier ? t("eventPage.paidPendingFree") : t("eventPage.paidPendingCheckBack"))}
        </Banner>
      ) : null}

      {event.description ? <Body>{event.description}</Body> : null}

      {event.seating_mode === "assigned_seating" ? (
        <SeatedCheckout eventID={event.id} />
      ) : (
        <TicketCheckout
          eventID={event.id}
          ticketTypes={ticketTypes}
          onSale={data.on_sale && !suspended}
          soldOut={data.sold_out}
          paidSalesPending={paidSalesPending}
          campaignToken={campaignToken}
          onSoldOut={() => void load()}
        />
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
  category: { color: theme.brand, fontWeight: "600" },
});
