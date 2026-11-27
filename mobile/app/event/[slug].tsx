import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { CalendarLinks } from "../../components/calendar-links";
import { ReportEvent } from "../../components/report-event";
import { useCategoryLabel } from "../../components/posters";
import { SeatedCheckout } from "../../components/seated-checkout";
import { TicketCheckout } from "../../components/ticket-checkout";
import { Banner, Body, Heading, Loading, Muted, Screen } from "../../components/ui";
import { cityLabel } from "../../lib/catalogue";
import { ApiError, api } from "../../lib/client";
import { formatInTimezone } from "../../lib/datetime";
import { useI18n } from "../../lib/i18n/context";
import { mediaURL } from "../../lib/media";
import { formatTiyn, toTiyn } from "../../lib/money";
import type { PublicEventResponse } from "../../lib/models";
import { radius, theme } from "../../lib/theme";

/**
 * The public event page: details, calendar links, and tickets - general
 * admission or the seat map. A campaign QR arrives as ?c=CMP_..., and only
 * that opaque token travels; the server decides what it is worth.
 */
export default function EventScreen() {
  const { t, locale } = useI18n();
  const categoryLabel = useCategoryLabel();
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
  const image = mediaURL(event.cover_image_url);
  const prices = ticketTypes.map((type) => toTiyn(type.price_kzt));
  const cheapest = prices.length > 0 ? Math.min(...prices) : null;
  const label = categoryLabel(event.category);
  // Beside the venue, as on the website (BF-100).
  const venueLine = [event.venue_name, cityLabel(t, event.city)].filter(Boolean).join(" · ");

  return (
    <Screen>
      <Stack.Screen options={{ title: event.title }} />
      {/* The banner, as on the website (BF-100): the poster blurred behind a dark shade. */}
      <View style={styles.band}>
        {image ? <Image source={{ uri: image }} style={styles.blur} blurRadius={24} /> : null}
        <View style={styles.shade} />
        {image ? <Image source={{ uri: image }} style={styles.poster} accessibilityLabel={event.title} /> : null}
        {label ? <Text style={styles.kicker}>{label}</Text> : null}
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.line}>{formatInTimezone(event.starts_at, event.timezone, locale)}</Text>
        <Text style={styles.address}>{t("eventPage.until", { time: formatInTimezone(event.ends_at, event.timezone, locale), tz: event.timezone })}</Text>
        {venueLine ? (
          <Text style={styles.line}>
            {venueLine}
            {event.venue_address ? <Text style={styles.address}>{`, ${event.venue_address}`}</Text> : null}
          </Text>
        ) : null}
        {cheapest !== null ? (
          <Text style={styles.price}>{cheapest === 0 ? t("tickets.free") : t("home.from", { price: formatTiyn(cheapest) })}</Text>
        ) : null}
      </View>
      <CalendarLinks event={event} />

      {suspended ? <Banner tone="error" title={t("eventPage.suspendedTitle")}>{t("eventPage.suspendedBody")}</Banner> : null}
      {paidSalesPending ? (
        <Banner tone="warning" title={t("eventPage.paidPendingTitle")}>
          {t("eventPage.paidPendingBody") + (hasFreeTier ? t("eventPage.paidPendingFree") : t("eventPage.paidPendingCheckBack"))}
        </Banner>
      ) : null}

      {event.description ? (
        <>
          <Heading>{t("home.aboutEvent")}</Heading>
          <Body>{event.description}</Body>
        </>
      ) : null}

      {event.seating_mode === "assigned_seating" ? (
        <SeatedCheckout eventID={event.id} campaignToken={campaignToken} />
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

      <ReportEvent eventID={event.id} organizerID={event.organizer_id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: {
    backgroundColor: theme.top,
    borderRadius: radius.lg,
    overflow: "hidden",
    padding: 16,
    gap: 6,
  },
  blur: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  shade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.65)" },
  poster: { width: 180, height: 270, borderRadius: radius.md, alignSelf: "center", marginBottom: 10, backgroundColor: theme.border },
  kicker: { alignSelf: "flex-start", color: "#ffffff", backgroundColor: theme.brand, borderRadius: radius.sm, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3, fontSize: 12, fontWeight: "700" },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "800", lineHeight: 29 },
  line: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  address: { color: "rgba(255,255,255,0.75)", fontWeight: "400", fontSize: 13 },
  price: { marginTop: 8, color: "#ffffff", fontSize: 17, fontWeight: "800" },
});
