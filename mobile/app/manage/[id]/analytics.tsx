import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Banner, Body, Button, Card, Choice, Field, Heading, KV, Loading, Muted, Row, Screen, Stat, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { useT } from "../../../lib/i18n/context";
import type { EventAnalytics, TicketType } from "../../../lib/models";
import { formatKZT, toTiyn } from "../../../lib/money";
import { radius, theme } from "../../../lib/theme";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Sales, revenue, fees, payout and check-in figures (SRS 4.10). */
export default function AnalyticsScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<EventAnalytics | null>(null);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ticketTypeID, setTicketTypeID] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await api.eventAnalytics(id, {
        from: DAY.test(from.trim()) ? from.trim() : undefined,
        to: DAY.test(to.trim()) ? to.trim() : undefined,
        ticketTypeID: ticketTypeID || undefined,
      });
      setData(result.analytics);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.analytics.loadFailed"));
    }
  }, [id, from, to, ticketTypeID, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api.listTicketTypes(id).then(setTypes).catch(() => setTypes([]));
  }, [id]);

  const peak = data ? Math.max(...data.sales_over_time.map((point) => toTiyn(point.revenue_kzt)), 1) : 1;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.analytics.heading") }} />
      <Title>{t("org.analytics.heading")}</Title>
      <Muted>{t("org.analytics.subtitle")}</Muted>
      <Row>
        <View style={styles.half}>
          <Field label={t("org.analytics.from")} value={from} onChangeText={setFrom} hint="YYYY-MM-DD" autoCapitalize="none" />
        </View>
        <View style={styles.half}>
          <Field label={t("org.analytics.to")} value={to} onChangeText={setTo} hint="YYYY-MM-DD" autoCapitalize="none" />
        </View>
      </Row>
      <Choice
        label={t("org.analytics.ticketType")}
        options={[{ value: "", label: t("org.analytics.allTypes") }, ...types.map((type) => ({ value: type.id, label: type.name }))]}
        value={ticketTypeID}
        onChange={setTicketTypeID}
      />
      <Row>
        <Button small variant="secondary" title={t("org.common.refresh")} onPress={() => void load()} />
        <Button
          small
          variant="ghost"
          title={t("org.analytics.clear")}
          onPress={() => {
            setFrom("");
            setTo("");
            setTicketTypeID("");
          }}
        />
      </Row>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {!data ? (
        <Loading label={t("org.analytics.calculating")} />
      ) : (
        <>
          <Row>
            <Stat label={t("org.analytics.sold")} value={String(data.tickets_sold)} detail={t("org.analytics.soldDetail", { capacity: data.total_capacity, percent: data.percentage_sold })} testID="stat-sold" />
            <Stat
              label={t("org.analytics.remaining")}
              value={String(data.tickets_remaining)}
              detail={
                data.tickets_refunded > 0
                  ? t("org.analytics.refundedCount", { count: data.tickets_refunded })
                  : data.orders_count === 1
                    ? t("org.analytics.orderOne")
                    : t("org.analytics.orderMany", { count: data.orders_count })
              }
            />
            <Stat
              label={t("org.analytics.gross")}
              value={formatKZT(data.gross_revenue_kzt)}
              detail={toTiyn(data.discounts_kzt) > 0 ? t("org.analytics.discounted", { amount: formatKZT(data.discounts_kzt) }) : t("org.analytics.noDiscounts")}
            />
            <Stat label={t("org.analytics.checkedIn")} value={String(data.checked_in)} detail={t("org.analytics.checkedInDetail", { absent: data.absent, percent: data.check_in_percentage })} />
            <Stat label={t("orgSettings.fees")} value={formatKZT(data.fees_kzt)} detail={t("orgSettings.feesDetail")} />
            <Stat label={t("orgSettings.payout")} value={formatKZT(data.estimated_payout_kzt)} detail={t("orgSettings.payoutDetail")} />
            {toTiyn(data.refunds_kzt) > 0 ? (
              <>
                <Stat label={t("org.analytics.refunded")} value={formatKZT(data.refunds_kzt)} detail={t("org.analytics.refundedDetail")} />
                <Stat label={t("org.analytics.net")} value={formatKZT(data.net_revenue_kzt)} detail={t("org.analytics.netDetail")} />
              </>
            ) : null}
          </Row>

          <Heading>{t("org.analytics.byType")}</Heading>
          {data.by_ticket_type.length === 0 ? (
            <Muted>{t("org.analytics.noTypes")}</Muted>
          ) : (
            data.by_ticket_type.map((row) => (
              <Card key={row.ticket_type_id}>
                <Body>{row.name} · {formatKZT(row.price_kzt)}</Body>
                <Row>
                  <KV label={t("org.analytics.colSold")} value={String(row.sold)} />
                  <KV label={t("org.analytics.colRemaining")} value={String(row.remaining)} />
                  <KV label={t("org.analytics.checkedIn")} value={String(row.checked_in)} />
                  <KV label={t("org.analytics.revenue")} value={formatKZT(row.revenue_kzt)} />
                </Row>
              </Card>
            ))
          )}

          {data.by_campaign.length > 0 ? (
            <>
              <Heading>{t("org.analytics.campaigns")}</Heading>
              {data.by_campaign.map((row) => (
                <Card key={row.campaign_id}>
                  <Body>{row.code}</Body>
                  <Muted>{row.name}</Muted>
                  <Row>
                    <KV label={t("org.analytics.orders")} value={String(row.redemptions)} />
                    <KV label={t("org.analytics.tickets")} value={String(row.tickets_sold)} />
                    <KV label={t("org.analytics.revenue")} value={formatKZT(row.revenue_kzt)} />
                  </Row>
                </Card>
              ))}
            </>
          ) : null}

          {data.sales_over_time.length > 0 ? (
            <>
              <Heading>{t("org.analytics.overTime")}</Heading>
              {data.sales_over_time.map((point) => (
                <View key={point.day} style={styles.point}>
                  <Muted>
                    {point.day} · {point.tickets === 1 ? t("org.analytics.ticketOne") : t("org.analytics.ticketMany", { count: point.tickets })} ·{" "}
                    {formatKZT(point.revenue_kzt)}
                  </Muted>
                  <View style={styles.track}>
                    <View style={[styles.bar, { width: `${Math.max(2, Math.round((toTiyn(point.revenue_kzt) / peak) * 100))}%` }]} />
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  half: { flex: 1, minWidth: 140 },
  point: { gap: 4 },
  track: { height: 8, backgroundColor: theme.surfaceAlt, borderRadius: radius.sm, overflow: "hidden" },
  bar: { height: 8, backgroundColor: theme.brand },
});
