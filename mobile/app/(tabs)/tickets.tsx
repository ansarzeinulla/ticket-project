import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { SignInPrompt } from "../../components/sign-in-prompt";
import { Banner, Body, Button, Card, Empty, Loading, Muted, Row, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { formatInTimezone } from "../../lib/datetime";
import { useT } from "../../lib/i18n/context";
import type { BuyerOrder } from "../../lib/models";
import { formatKZT } from "../../lib/money";
import { orderStatusLabel } from "../../lib/order-status";

/** The signed-in attendee's own orders (SRS 4.9) - the website's "My tickets". */
export default function TicketsScreen() {
  const t = useT();
  const { status } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }}>
      <Title>{t("myOrders.heading")}</Title>
      <Muted>{t("myOrders.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {orders === null ? (
        <Loading label={t("myOrders.loading")} />
      ) : orders.length === 0 ? (
        <>
          <Empty>{t("myOrders.empty")}</Empty>
          <Button variant="secondary" title={t("myOrders.browse")} onPress={() => router.push("/explore")} />
        </>
      ) : (
        orders.map((order) => (
          <Card key={order.id} onPress={() => router.push(`/order/${order.id}`)} testID={`order-${order.order_number}`}>
            <Body>{order.event_title}</Body>
            <Muted>{formatInTimezone(order.event_starts_at, order.timezone)}</Muted>
            <Row>
              <Muted>{order.order_number}</Muted>
              <Muted>
                {order.ticket_count === 1
                  ? t("myOrders.ticketsOne", { count: order.ticket_count })
                  : t("myOrders.ticketsMany", { count: order.ticket_count })}
              </Muted>
              <Muted>{orderStatusLabel(t, order.status)}</Muted>
              <Muted>{formatKZT(order.total_kzt)}</Muted>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
