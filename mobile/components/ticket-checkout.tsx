import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import type { PromoPreview, TicketType } from "../lib/models";
import { formatKZT, formatTiyn, toTiyn } from "../lib/money";
import { theme } from "../lib/theme";
import { Banner, Button, Card, Check, Field, Heading, Muted, Row } from "./ui";

/**
 * General-admission tickets: pick quantities, optionally apply a promo code
 * (or the campaign token from a scanned QR), then pay - the same flow as the
 * website's ticket selector and checkout dialog. Payment is simulated.
 */
export function TicketCheckout({
  eventID,
  ticketTypes,
  onSale,
  soldOut,
  paidSalesPending,
  campaignToken,
  onSoldOut,
}: {
  eventID: string;
  ticketTypes: TicketType[];
  onSale: boolean;
  soldOut: boolean;
  paidSalesPending: boolean;
  campaignToken?: string;
  onSoldOut: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [promo, setPromo] = useState<PromoPreview | null>(null);
  // Whether the applied discount came from a typed code or a scanned campaign link.
  const [source, setSource] = useState<"code" | "token">("code");
  const [code, setCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [dismissedToken, setDismissedToken] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [name, setName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  // A signed-in buyer's own details, locked unless they buy for somebody else (BF-100).
  const [useAccount, setUseAccount] = useState(true);
  const locked = Boolean(user && useAccount);
  // The account can arrive after the first render; fill in once it does.
  useEffect(() => {
    if (user && useAccount) {
      setName(user.full_name);
      setEmail(user.email);
    }
  }, [user, useAccount]);
  const chooseAccount = (on: boolean) => {
    setUseAccount(on);
    setName(on && user ? user.full_name : "");
    setEmail(on && user ? user.email : "");
  };
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const items = useMemo(
    () =>
      Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity })),
    [quantities],
  );
  const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalTiyn = items.reduce((sum, item) => {
    const type = ticketTypes.find((entry) => entry.id === item.ticket_type_id);
    return sum + (type ? toTiyn(type.price_kzt) * item.quantity : 0);
  }, 0);
  const payableTiyn = promo ? toTiyn(promo.total_kzt) : subtotalTiyn;

  const preview = useCallback(
    async (input: { code?: string; campaign_token?: string }) => {
      if (items.length === 0) {
        setPromoError(t("promo.chooseFirst"));
        return;
      }
      setCheckingPromo(true);
      setPromoError(null);
      try {
        setPromo(await api.previewPromo(eventID, { ...input, items }));
        setSource(input.campaign_token ? "token" : "code");
      } catch (cause) {
        setPromo(null);
        setPromoError(cause instanceof ApiError ? cause.message : t("promo.couldNotApply"));
      } finally {
        setCheckingPromo(false);
      }
    },
    [eventID, items, t],
  );

  // A scanned campaign QR applies itself once tickets are chosen, and is
  // re-priced whenever the basket changes - unless the attendee removed it.
  useEffect(() => {
    if (items.length === 0) {
      setPromo(null);
      return;
    }
    if (promo) {
      void preview(source === "token" && campaignToken ? { campaign_token: campaignToken } : { code: promo.code });
    } else if (campaignToken && !dismissedToken) {
      void preview({ campaign_token: campaignToken });
    }
    // Re-price on basket changes only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, JSON.stringify(items)]);

  function change(type: TicketType, delta: number) {
    const limit = Math.min(type.quantity_remaining, type.max_per_order);
    setQuantities((current) => {
      const next = Math.max(0, Math.min(limit, (current[type.id] ?? 0) + delta));
      return { ...current, [type.id]: next };
    });
  }

  async function pay() {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.buyer_name = t("checkout.nameRequired");
    if (!email.trim()) errors.buyer_email = t("checkout.emailRequired");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const result = await api.checkout(eventID, {
        buyer_name: name.trim(),
        buyer_email: email.trim(),
        items,
        ...(promo && source === "code" ? { promo_code: promo.code } : {}),
        ...(promo && source === "token" && campaignToken ? { campaign_token: campaignToken } : {}),
      });
      router.replace(`/order/${result.order.id}`);
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.isPromoProblem) {
        setPromo(null);
        setFormError(error.message + t("checkout.priceUpdated"));
        return;
      }
      if (error instanceof ApiError && error.isSoldOut) {
        setFormError(error.remaining === 0 ? t("checkout.soldOutDuring") : t("checkout.soldOutPartial", { message: error.message }));
        onSoldOut();
        return;
      }
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setFormError(Object.keys(error.fields).length > 0 ? t("checkout.correctFields") : error.message);
        return;
      }
      setFormError(t("checkout.failed"));
    }
  }

  if (ticketTypes.length === 0) {
    return (
      <>
        <Heading>{t("tickets.heading")}</Heading>
        <Muted>{t("tickets.none")}</Muted>
      </>
    );
  }

  return (
    <View style={styles.wrap}>
      <Heading>{t("tickets.heading")}</Heading>
      {soldOut ? <Banner title={t("tickets.soldOutTitle")}>{t("tickets.soldOutBody")}</Banner> : null}
      {!onSale && !soldOut ? <Banner title={t("tickets.notOnSaleTitle")}>{t("tickets.notOnSaleBody")}</Banner> : null}

      {ticketTypes.map((type) => {
        const quantity = quantities[type.id] ?? 0;
        const blocked = !onSale || (paidSalesPending && !type.is_free);
        const limit = Math.min(type.quantity_remaining, type.max_per_order);
        return (
          <Card key={type.id}>
            <Row style={styles.between}>
              <View style={styles.grow}>
                <Text style={styles.name}>{type.name}</Text>
                {type.description ? <Muted>{type.description}</Muted> : null}
                <Muted>
                  {type.quantity_remaining === 0
                    ? t("tickets.soldOutShort")
                    : t("tickets.remaining", { remaining: type.quantity_remaining, total: type.quantity_total })}
                </Muted>
              </View>
              <Text style={styles.price}>{type.is_free ? t("tickets.free") : formatKZT(type.price_kzt)}</Text>
            </Row>
            <Row>
              <Button small variant="secondary" title="−" disabled={blocked || quantity === 0} onPress={() => change(type, -1)} testID={`minus-${type.name}`} />
              <Text style={styles.qty} accessibilityLabel={`${type.name}: ${quantity}`}>{quantity}</Text>
              <Button small variant="secondary" title="+" disabled={blocked || quantity >= limit} onPress={() => change(type, 1)} testID={`plus-${type.name}`} />
            </Row>
          </Card>
        );
      })}

      <Card>
        {promo ? (
          <>
            <Text style={styles.success}>
              {t("promo.applied", { code: promo.code })} · {promo.campaign_name}
              {promo.discount_type === "percentage"
                ? ` · ${t("promo.percentOff", { value: Number(promo.discount_value) })}`
                : ` · ${t("promo.amountOff", { amount: formatKZT(promo.discount_value) })}`}
              {!promo.applies_to_all ? ` · ${t("promo.selectedOnly")}` : ""}
            </Text>
            <Muted>{t("promo.subtotal")}: {formatKZT(promo.subtotal_kzt)}</Muted>
            <Muted>{t("promo.discount")}: −{formatKZT(promo.discount_kzt)}</Muted>
            <Text style={styles.success}>{t("promo.newTotal")}: {formatKZT(promo.total_kzt)}</Text>
            <Button
              small
              variant="ghost"
              title={t("promo.remove")}
              onPress={() => {
                setPromo(null);
                setDismissedToken(true);
              }}
            />
          </>
        ) : (
          <>
            <Field label={t("promo.haveCode")} value={code} onChangeText={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" />
            <Button small variant="secondary" title={t("promo.apply")} loading={checkingPromo} disabled={!code.trim()} onPress={() => void preview({ code: code.trim() })} />
            {checkingPromo ? <Muted>{t("promo.checking")}</Muted> : null}
          </>
        )}
        {promoError ? <Text style={styles.error}>{promoError}</Text> : null}
      </Card>

      <Row style={styles.between}>
        <Muted>
          {totalTickets === 0
            ? t("tickets.noneSelected")
            : totalTickets === 1
              ? t("tickets.countOne", { count: totalTickets })
              : t("tickets.countMany", { count: totalTickets })}
        </Muted>
        <Text style={styles.price}>{formatTiyn(payableTiyn)}</Text>
      </Row>

      {!checkingOut ? (
        <Button title={t("tickets.getTickets")} disabled={!onSale || totalTickets === 0} onPress={() => setCheckingOut(true)} testID="get-tickets" />
      ) : (
        <Card>
          <Heading>{t("checkout.title")}</Heading>
          {user ? <Check label={t("home.useAccount")} value={useAccount} onChange={chooseAccount} /> : null}
          <Field label={t("checkout.nameLabel")} value={name} onChangeText={setName} placeholder={t("checkout.namePlaceholder")} error={fieldErrors.buyer_name} autoCapitalize="words" editable={!locked} testID="buyer-name" />
          <Field
            label={t("checkout.emailLabel")}
            value={email}
            onChangeText={setEmail}
            placeholder={t("checkout.emailPlaceholder")}
            hint={t("checkout.emailHint")}
            error={fieldErrors.buyer_email}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!locked}
            testID="buyer-email"
          />
          {formError ? <Banner tone="error">{formError}</Banner> : null}
          <Button
            title={submitting ? t("checkout.processing") : t("checkout.pay", { amount: formatTiyn(payableTiyn) })}
            loading={submitting}
            onPress={() => void pay()}
            testID="pay"
          />
          <Button variant="ghost" title={t("checkout.cancel")} disabled={submitting} onPress={() => setCheckingOut(false)} />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  between: { justifyContent: "space-between" },
  grow: { flex: 1, gap: 2 },
  name: { color: theme.text, fontSize: 16, fontWeight: "600" },
  price: { color: theme.text, fontSize: 16, fontWeight: "700" },
  qty: { color: theme.text, fontSize: 18, minWidth: 28, textAlign: "center" },
  success: { color: theme.successBright, fontSize: 14, fontWeight: "600" },
  error: { color: theme.dangerBright, fontSize: 13 },
});
