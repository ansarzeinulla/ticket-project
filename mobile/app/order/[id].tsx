import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Linking, StyleSheet, Text } from "react-native";

import { CalendarLinks } from "../../components/calendar-links";
import { OrderSupport } from "../../components/order-support";
import { Badge, Banner, Body, Button, Card, Heading, KV, Loading, Muted, Row, Screen, Title } from "../../components/ui";
import { ApiError, api, ticketPDFURL, ticketQRURL } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import type { MessageKey } from "../../lib/i18n/dictionaries";
import type { BiletEvent, CheckoutResult } from "../../lib/models";
import { formatKZT } from "../../lib/money";
import { orderStatusLabel } from "../../lib/order-status";
import { radius, theme } from "../../lib/theme";

const TICKET_STATUS: Record<string, MessageKey> = {
  valid: "ticketCard.statusValid",
  checked_in: "ticketCard.statusCheckedIn",
  cancelled: "ticketCard.statusCancelled",
  refunded: "ticketCard.statusRefunded",
};

/** The order confirmation: tickets with their QR codes, PDF, calendar, support. */
export default function OrderScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<CheckoutResult | null>(null);
  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.getOrder(id);
      setData(result);
      setError(null);
      // For the calendar links; public for a published event.
      api.getEvent(result.order.event_id).then(setEvent).catch(() => setEvent(null));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("auth.common.genericError"));
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return <Screen>{error ? <Banner tone="error">{error}</Banner> : <Loading />}</Screen>;
  }

  const { order, items, tickets } = data;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("order.metaTitle") }} />
      <Title>✓ {t("order.confirmed")}</Title>
      <Muted>
        {tickets.length === 1
          ? t("order.issuedOne", { count: tickets.length, email: order.buyer_email })
          : t("order.issuedMany", { count: tickets.length, email: order.buyer_email })}
      </Muted>
      {event ? <CalendarLinks event={event} /> : null}

      <Card>
        <Row>
          <KV label={t("order.orderNumber")} value={order.order_number} />
          <KV label={t("order.status")} value={orderStatusLabel(t, order.status)} />
          <KV label={t("order.totalPaid")} value={formatKZT(order.total_kzt)} />
        </Row>
        <Heading>{t("order.summary")}</Heading>
        {items.map((item) => (
          <Row key={item.id} style={styles.between}>
            <Body>{item.quantity} × {item.ticket_type_name}</Body>
            <Body>{formatKZT(item.line_total_kzt)}</Body>
          </Row>
        ))}
      </Card>

      <Heading>{t("order.yourTickets")}</Heading>
      <Muted>{t("order.ticketsHint")}</Muted>
      {tickets.map((ticket) => (
        <Card key={ticket.id} testID={`ticket-${ticket.ticket_code}`}>
          <Row style={styles.between}>
            <Text style={styles.ticketName}>{ticket.ticket_type_name}</Text>
            <Badge text={TICKET_STATUS[ticket.status] ? t(TICKET_STATUS[ticket.status]) : ticket.status} />
          </Row>
          <Image source={{ uri: ticketQRURL(ticket.id) }} style={styles.qr} accessibilityLabel={t("ticketCard.qrAlt")} />
          <Muted>{t("ticketCard.admissionCode")}: {ticket.ticket_code}</Muted>
          <Button small variant="secondary" title={t("ticketCard.download")} onPress={() => void Linking.openURL(ticketPDFURL(ticket.id))} />
        </Card>
      ))}

      <OrderSupport orderID={order.id} buyerEmail={order.buyer_email} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: "space-between" },
  ticketName: { color: theme.text, fontSize: 16, fontWeight: "600" },
  qr: { width: 200, height: 200, alignSelf: "center", backgroundColor: "#fff", borderRadius: radius.sm },
});
