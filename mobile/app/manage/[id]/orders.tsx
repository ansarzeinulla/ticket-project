import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { Badge, Banner, Body, Button, Card, Empty, Field, Loading, Muted, Row, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { useT } from "../../../lib/i18n/context";
import { eventOrderStatusLabel } from "../../../lib/labels";
import type { EventOrder } from "../../../lib/models";
import { formatKZT } from "../../../lib/money";

/** The event's orders, with refunds and registration cancellations (SRS 4.7). */
export default function OrdersScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [orders, setOrders] = useState<EventOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await api.eventOrders(id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.orders.loadFailed"));
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(order: EventOrder) {
    setWorking(order.id);
    setError(null);
    try {
      if (order.refundable) {
        const result = await api.refundOrder(order.id, reason.trim() || undefined);
        setNotice(
          t("org.orders.refundedNotice", { amount: formatKZT(result.refund.amount_kzt), name: order.buyer_name }) +
            " " +
            (result.voided_tickets === 1 ? t("org.orders.voidOne") : t("org.orders.voidMany", { count: result.voided_tickets })),
        );
      } else {
        const result = await api.cancelOrder(order.id, reason.trim() || undefined);
        setNotice(
          t("org.orders.cancelledNotice", { name: order.buyer_name }) +
            " " +
            (result.cancelled_tickets === 1 ? t("org.orders.voidOne") : t("org.orders.voidMany", { count: result.cancelled_tickets })),
        );
      }
      setConfirming(null);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : order.refundable ? t("org.orders.refundFailed") : t("org.orders.cancelFailed"));
    } finally {
      setWorking(null);
    }
  }

  const refundedCount = (orders ?? []).filter((order) => order.status === "refunded").length;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.orders.heading") }} />
      <Title>{t("org.orders.heading")}</Title>
      {orders ? (
        <Muted>
          {orders.length === 0
            ? t("org.orders.none")
            : (orders.length === 1 ? t("org.analytics.orderOne") : t("org.analytics.orderMany", { count: orders.length })) +
              (refundedCount > 0 ? ` · ${t("org.analytics.refundedCount", { count: refundedCount })}` : "")}
        </Muted>
      ) : null}
      {notice ? <Banner tone="success" title={t("org.orders.refundComplete")}>{notice}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {orders === null ? (
        <Loading label={t("org.common.loading")} />
      ) : orders.length === 0 ? (
        <Empty>{t("org.orders.none")}</Empty>
      ) : (
        orders.map((order) => (
          <Card key={order.id} testID={`event-order-${order.order_number}`}>
            <Row>
              <Body>{order.buyer_name}</Body>
              <Badge text={eventOrderStatusLabel(t, order.status)} />
            </Row>
            <Muted>{order.buyer_email}</Muted>
            <Muted>
              {order.order_number} · {t("org.orders.ofIssued", { count: order.ticket_count })} ·{" "}
              {t("org.orders.checkedIn", { count: order.checked_in })} · {formatKZT(order.total_kzt)}
            </Muted>
            {order.status === "refunded" ? <Muted>{t("org.orders.refundedAmount", { amount: formatKZT(order.refunded_kzt) })}</Muted> : null}
            {order.refundable || order.cancellable ? (
              confirming === order.id ? (
                <>
                  <Banner tone="error">
                    {(order.refundable
                      ? t(order.live_tickets === 1 ? "org.orders.confirmRefundOne" : "org.orders.confirmRefundMany", {
                          amount: formatKZT(order.total_kzt),
                          name: order.buyer_name,
                          count: order.live_tickets,
                        })
                      : t(order.live_tickets === 1 ? "org.orders.confirmCancelOne" : "org.orders.confirmCancelMany", {
                          name: order.buyer_name,
                          count: order.live_tickets,
                        })) +
                      " " +
                      t("org.orders.irreversible")}
                  </Banner>
                  <Field label={t("org.orders.reason")} value={reason} onChangeText={setReason} />
                  <Row>
                    <Button
                      small
                      variant="danger"
                      title={order.refundable ? t("org.orders.confirmRefundButton") : t("org.orders.confirmCancelButton")}
                      loading={working === order.id}
                      onPress={() => void act(order)}
                      testID={`confirm-${order.order_number}`}
                    />
                    <Button small variant="ghost" title={t("org.form.cancel")} onPress={() => setConfirming(null)} />
                  </Row>
                </>
              ) : (
                <Button
                  small
                  variant="danger"
                  title={order.refundable ? t("org.orders.refund") : t("org.orders.cancelRegistration")}
                  disabled={working !== null}
                  onPress={() => {
                    setConfirming(order.id);
                    setReason("");
                    setNotice(null);
                  }}
                  testID={`order-action-${order.order_number}`}
                />
              )
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
