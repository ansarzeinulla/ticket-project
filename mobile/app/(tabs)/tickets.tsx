import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { SignInPrompt } from "../../components/sign-in-prompt";
import { Banner, Button, Empty, Loading, Muted, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { formatInTimezone } from "../../lib/datetime";
import { useI18n } from "../../lib/i18n/context";
import { mediaURL } from "../../lib/media";
import { radius, theme } from "../../lib/theme";
import type { BuyerOrder } from "../../lib/models";
import { formatKZT } from "../../lib/money";
import { orderStatusLabel } from "../../lib/order-status";

/** The signed-in attendee's own orders (SRS 4.9) - the website's "My tickets". */
export default function TicketsScreen() {
  const { t, locale } = useI18n();
  const { status } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const load = useCallback(async () => {
    try {
      setOrders((await api.listMyOrders()).orders);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("myOrders.error"));
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      if (status === "signedIn") void load();
    }, [status, load]),
  );

  if (status !== "signedIn") {
    return (
      <Screen>
        <Title>{t("myOrders.heading")}</Title>
        <SignInPrompt message={t("myOrders.subtitle")} />
      </Screen>
    );
  }

  const now = Date.now();
  const upcoming = (orders ?? []).filter((order) => new Date(order.event_starts_at).getTime() >= now);
  const past = (orders ?? []).filter((order) => new Date(order.event_starts_at).getTime() < now).reverse();
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}>
      <Title>{t("myOrders.heading")}</Title>
      <Muted>{t("myOrders.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["upcoming", "past"] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            style={[styles.tab, tab === key && styles.tabActive]}
            testID={`orders-tab-${key}`}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {t(key === "upcoming" ? "home.upcomingTickets" : "home.pastTickets")} ({key === "upcoming" ? upcoming.length : past.length})
            </Text>
          </Pressable>
        ))}
      </View>
      {orders === null ? (
        <Loading label={t("myOrders.loading")} />
      ) : orders.length === 0 ? (
        <>
          <Empty>{t("myOrders.empty")}</Empty>
          <Button variant="secondary" title={t("myOrders.browse")} onPress={() => router.push("/explore")} />
        </>
      ) : shown.length === 0 ? (
        <Empty>{t(tab === "upcoming" ? "home.noUpcoming" : "home.noPast")}</Empty>
      ) : (
        shown.map((order) => {
          const image = mediaURL(order.cover_image_url);
          return (
            <Pressable
              key={order.id}
              onPress={() => router.push(`/order/${order.id}`)}
              style={({ pressed }) => [styles.card, tab === "past" && styles.faded, pressed && styles.pressed]}
              accessibilityRole="button"
              testID={`order-${order.order_number}`}
            >
              {image ? <Image source={{ uri: image }} style={styles.poster} /> : null}
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{order.event_title}</Text>
                <Text style={styles.when}>{formatInTimezone(order.event_starts_at, order.timezone, locale)}</Text>
                {order.venue_name ? <Text style={styles.muted} numberOfLines={1}>{order.venue_name}</Text> : null}
                <View style={styles.stub}>
                  <Text style={styles.muted}>
                    {order.ticket_count === 1
                      ? t("myOrders.ticketsOne", { count: order.ticket_count })
                      : t("myOrders.ticketsMany", { count: order.ticket_count })}
                  </Text>
                  <Text style={styles.total}>{formatKZT(order.total_kzt)}</Text>
                </View>
                <Text style={[styles.status, order.live_tickets === 0 && styles.statusOff]}>{orderStatusLabel(t, order.status)}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 22, borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  tabActive: { borderBottomColor: theme.brand },
  tabText: { color: theme.textMuted, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: theme.text },
  card: { flexDirection: "row", backgroundColor: theme.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, overflow: "hidden" },
  faded: { opacity: 0.75 },
  pressed: { opacity: 0.85 },
  poster: { width: 92, backgroundColor: theme.surfaceAlt },
  body: { flex: 1, padding: 12, gap: 3 },
  title: { color: theme.text, fontSize: 16, fontWeight: "800", lineHeight: 20 },
  when: { color: theme.text, fontSize: 13, fontWeight: "600" },
  muted: { color: theme.textMuted, fontSize: 13 },
  stub: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border, borderStyle: "dashed" },
  total: { color: theme.text, fontSize: 16, fontWeight: "800" },
  status: { color: theme.success, fontSize: 13, fontWeight: "700" },
  statusOff: { color: theme.textMuted },
});
