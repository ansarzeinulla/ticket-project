import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import type { MessageKey } from "../lib/i18n/dictionaries";
import type { Hold, Seat, SeatMap } from "../lib/models";
import { formatKZT, formatTiyn, toTiyn } from "../lib/money";
import { radius, theme } from "../lib/theme";
import { Banner, Button, Card, Field, Heading, Loading, Muted, Row } from "./ui";

type SeatState = Seat["status"] | "selected";

/** Every state has a symbol as well as a colour (SRS 4.3.1). */
const STATE: Record<SeatState, { fill: string; border: string; symbol: string; label: MessageKey }> = {
  available: { fill: theme.surfaceAlt, border: theme.brand, symbol: "", label: "seatMap.available" },
  selected: { fill: theme.brand, border: theme.brand, symbol: "✓", label: "seatMap.selected" },
  held: { fill: "#3a2a10", border: theme.warning, symbol: "⏳", label: "seatMap.held" },
  sold: { fill: theme.surface, border: theme.border, symbol: "×", label: "seatMap.sold" },
  unavailable: { fill: "transparent", border: theme.border, symbol: "−", label: "seatMap.unavailable" },
};

/**
 * Assigned seating: choose seats on the map, hold them, then pay before the
 * hold runs out - the website's seat map and seat checkout. The server holds
 * the seats atomically, so two people cannot buy the same one.
 */
export function SeatedCheckout({ eventID }: { eventID: string }) {
  const t = useT();
  const [orderID, setOrderID] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (orderID) {
    return (
      <HeldSeats
        orderID={orderID}
        onEnded={(message) => {
          setOrderID(null);
          setNotice(message);
        }}
      />
    );
  }
  return (
    <View style={styles.wrap}>
      {notice ? <Banner>{notice}</Banner> : null}
      <SeatPicker eventID={eventID} onHeld={setOrderID} t={t} />
    </View>
  );
}

function SeatPicker({
  eventID,
  onHeld,
  t,
}: {
  eventID: string;
  onHeld: (orderID: string) => void;
  t: ReturnType<typeof useT>;
}) {
  const [plan, setPlan] = useState<SeatMap | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);

  const load = useCallback(async () => {
    try {
      setPlan(await api.seatMap(eventID));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("seatMap.loadFailed"));
    }
  }, [eventID, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const priceBySeat = useMemo(() => {
    const prices = new Map<string, { section: string; price: string }>();
    for (const section of plan?.sections ?? []) {
      for (const row of section.rows) {
        for (const seat of row.seats) prices.set(seat.id, { section: section.name, price: section.price_kzt ?? "0" });
      }
    }
    return prices;
  }, [plan]);

  const totalTiyn = selected.reduce((sum, id) => sum + toTiyn(priceBySeat.get(id)?.price ?? "0"), 0);

  async function hold() {
    setHolding(true);
    setError(null);
    try {
      const result = await api.holdSeats(eventID, selected);
      onHeld(result.order_id);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("seatMap.holdFailed"));
      setSelected([]);
      await load();
    } finally {
      setHolding(false);
    }
  }

  if (!plan) return error ? <Banner tone="error">{error}</Banner> : <Loading label={t("seatMap.loading")} />;

  return (
    <View style={styles.wrap}>
      <Heading>{t("seatMap.heading")}</Heading>
      <Row style={styles.between}>
        <Muted>
          {plan.venue_name} · {t("seatMap.free", { free: plan.available_seats, total: plan.total_seats })}
        </Muted>
        <Button small variant="secondary" title={t("seatMap.refresh")} onPress={() => void load()} />
      </Row>
      {error ? <Banner tone="error">{error}</Banner> : null}

      <Card testID="seat-map">
        <Text style={styles.stage}>{t("seatMap.stage")}</Text>
        {plan.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Muted>
              {section.name}
              {section.price_kzt ? ` · ${formatKZT(section.price_kzt)}` : ""}
            </Muted>
            {section.rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <View style={styles.seats}>
                  {row.seats.map((seat) => {
                    const state: SeatState = selected.includes(seat.id) ? "selected" : seat.status;
                    const look = STATE[state];
                    const clickable = seat.status === "available";
                    const label =
                      t("seatMap.seatLabel", { section: section.name, row: row.label, seat: seat.number }) +
                      (seat.accessible ? t("seatMap.accessibleSuffix") : "") +
                      ` — ${t(look.label)}`;
                    return (
                      <Pressable
                        key={seat.id}
                        disabled={!clickable}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityState={{ selected: state === "selected", disabled: !clickable }}
                        onPress={() =>
                          setSelected((current) =>
                            current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id],
                          )
                        }
                        style={[
                          styles.seat,
                          { backgroundColor: look.fill, borderColor: look.border },
                          seat.accessible && styles.accessible,
                        ]}
                      >
                        <Text style={[styles.seatText, state === "selected" && styles.seatTextSelected]}>
                          {look.symbol || (seat.accessible ? "♿" : seat.number)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ))}
      </Card>

      <Row>
        {(Object.keys(STATE) as SeatState[]).map((state) => (
          <Muted key={state}>
            {STATE[state].symbol ? `${STATE[state].symbol} ` : "○ "}
            {t(STATE[state].label)}
          </Muted>
        ))}
        <Muted>♿ {t("seatMap.accessibleLegend")}</Muted>
      </Row>

      <Row style={styles.between}>
        <Muted>
          {selected.length === 0
            ? t("seatMap.noneSelected")
            : selected.length === 1
              ? t("seatMap.selectedOne")
              : t("seatMap.selectedMany", { count: selected.length })}
        </Muted>
        <Text style={styles.total}>{formatTiyn(totalTiyn)}</Text>
      </Row>
      <Button title={t("seatMap.hold")} disabled={selected.length === 0} loading={holding} onPress={() => void hold()} testID="hold-seats" />
    </View>
  );
}

function HeldSeats({ orderID, onEnded }: { orderID: string; onEnded: (message: string) => void }) {
  const t = useT();
  const { user } = useAuth();
  const [hold, setHold] = useState<Hold | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [name, setName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getHold(orderID)
      .then((basket) => {
        setHold(basket);
        setRemaining(basket.seconds_remaining);
      })
      .catch(() => setRemaining(0));
  }, [orderID]);

  // Counted down from the server's number of seconds, not the phone's clock.
  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => (value ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  useEffect(() => {
    if (remaining !== null && remaining <= 0) onEnded(t("seatCheckout.expiredNotice"));
  }, [remaining, onEnded, t]);

  async function pay() {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.buyer_name = t("checkout.nameRequired");
    if (!email.trim()) errors.buyer_email = t("checkout.emailRequired");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.confirmHold(orderID, { buyer_name: name.trim(), buyer_email: email.trim() });
      router.replace(`/order/${result.order.id}`);
    } catch (cause) {
      setSubmitting(false);
      if (cause instanceof ApiError && cause.code === "hold_expired") {
        onEnded(t("seatCheckout.expiredNotice"));
        return;
      }
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(Object.keys(cause.fields).length > 0 ? null : cause.message);
      } else {
        setError(t("auth.common.genericError"));
      }
    }
  }

  async function release() {
    try {
      await api.releaseHold(orderID);
    } catch {
      // The hold expires on its own.
    }
    onEnded(t("seatCheckout.releasedNotice"));
  }

  if (!hold || remaining === null) return <Loading label={t("seatCheckout.checking")} />;

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <Card testID="held-seats">
      <Row style={styles.between}>
        <Heading>{t("seatCheckout.heading")}</Heading>
        <Text style={[styles.timer, remaining < 120 && styles.timerUrgent]} accessibilityRole="timer">
          {t("seatCheckout.left", { time: `${minutes}:${seconds}` })}
        </Text>
      </Row>
      <Muted>
        {hold.items.length === 1 ? t("seatCheckout.seatOne") : t("seatCheckout.seatMany", { count: hold.items.length })} ·{" "}
        {hold.order_number}
      </Muted>
      <Muted>{t("seatCheckout.tickets")}: {formatKZT(hold.subtotal_kzt)}</Muted>
      <Muted>{t("seatCheckout.fee")}: {formatKZT(hold.estimated_processing_fee_kzt)}</Muted>
      <Text style={styles.total}>{t("seatCheckout.total")}: {formatKZT(hold.estimated_total_kzt)}</Text>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label={t("seatCheckout.name")} value={name} onChangeText={setName} error={fieldErrors.buyer_name} autoCapitalize="words" testID="buyer-name" />
      <Field
        label={t("auth.common.email")}
        value={email}
        onChangeText={setEmail}
        hint={t("seatCheckout.emailHint")}
        error={fieldErrors.buyer_email}
        keyboardType="email-address"
        autoCapitalize="none"
        testID="buyer-email"
      />
      <Button
        title={t("seatCheckout.pay", { amount: formatKZT(hold.estimated_total_kzt) })}
        loading={submitting}
        onPress={() => void pay()}
        testID="pay-seats"
      />
      <Button variant="ghost" title={t("seatCheckout.release")} disabled={submitting} onPress={() => void release()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  between: { justifyContent: "space-between" },
  stage: {
    color: theme.textMuted,
    textAlign: "center",
    backgroundColor: theme.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: 4,
    fontSize: 12,
    letterSpacing: 2,
  },
  section: { gap: 4, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLabel: { color: theme.textMuted, width: 16, fontSize: 12 },
  seats: { flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 },
  seat: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  accessible: { borderStyle: "dashed" },
  seatText: { color: theme.textMuted, fontSize: 10 },
  seatTextSelected: { color: theme.bg, fontWeight: "700" },
  total: { color: theme.text, fontSize: 16, fontWeight: "700" },
  timer: { color: theme.textMuted, fontWeight: "700" },
  timerUrgent: { color: theme.dangerBright },
});
