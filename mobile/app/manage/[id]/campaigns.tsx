import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Linking, Share, StyleSheet } from "react-native";

import { Badge, Banner, Body, Button, Card, Check, Choice, Empty, Field, Heading, KV, Loading, Muted, Row, Screen, Title } from "../../../components/ui";
import { ApiError, api, campaignQRURL } from "../../../lib/client";
import { DATE_INPUT_HINT, inputToISO } from "../../../lib/date-input";
import { useT } from "../../../lib/i18n/context";
import { campaignStatusLabel } from "../../../lib/labels";
import type { BiletEvent, Campaign, DiscountType, TicketType } from "../../../lib/models";
import { formatKZT } from "../../../lib/money";
import { radius } from "../../../lib/theme";

/** Promo codes and QR campaigns, with their figures (SRS 4.11). */
export default function CampaignsScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyID, setBusyID] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("20");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [onlyTypes, setOnlyTypes] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [loaded, list, ticketTypes] = await Promise.all([api.getEvent(id), api.listCampaigns(id), api.listTicketTypes(id)]);
      setEvent(loaded);
      setCampaigns(list);
      setTypes(ticketTypes);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.campaigns.loadFailed"));
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!event) return;
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = t("org.campaigns.errName");
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(code.trim())) errors.code = t("org.campaigns.errCode");
    if (!/^\d+(\.\d{1,2})?$/.test(discountValue.trim()) || Number(discountValue) <= 0) {
      errors.discount_value = t("org.campaigns.errDiscount");
    } else if (discountType === "percentage" && Number(discountValue) > 100) {
      errors.discount_value = t("org.campaigns.errPercent");
    }
    let limit: number | undefined;
    if (maxRedemptions.trim() !== "") {
      limit = Number(maxRedemptions);
      if (!Number.isInteger(limit) || limit <= 0) errors.max_redemptions = t("org.campaigns.errLimit");
    }
    const startsISO = inputToISO(startsAt, event.timezone);
    const endsISO = inputToISO(endsAt, event.timezone);
    if (startsISO && endsISO && new Date(endsISO) <= new Date(startsISO)) errors.ends_at = t("orgSettings.errCampaignOrder");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await api.createCampaign(id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: discountValue.trim(),
        ...(limit !== undefined ? { max_redemptions: limit } : {}),
        ...(startsISO ? { starts_at: startsISO } : {}),
        ...(endsISO ? { ends_at: endsISO } : {}),
        ...(onlyTypes.length > 0 ? { ticket_type_ids: onlyTypes } : {}),
      });
      setCampaigns((current) => [created, ...(current ?? [])]);
      setName("");
      setCode("");
      setMaxRedemptions("");
      setStartsAt("");
      setEndsAt("");
      setOnlyTypes([]);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setFormError(Object.keys(cause.fields).length > 0 ? t("auth.common.fixFields") : cause.message);
      } else {
        setFormError(t("org.campaigns.createFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(campaign: Campaign) {
    setBusyID(campaign.id);
    try {
      const updated = await api.setCampaignActive(campaign.id, campaign.status !== "active");
      setCampaigns((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.types.changeFailed"));
    } finally {
      setBusyID(null);
    }
  }

  async function remove(campaign: Campaign) {
    setBusyID(campaign.id);
    try {
      await api.deleteCampaign(campaign.id);
      setCampaigns((current) => (current ?? []).filter((item) => item.id !== campaign.id));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.campaigns.deleteFailed"));
    } finally {
      setBusyID(null);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.campaigns.heading") }} />
      <Title>{t("org.campaigns.heading")}</Title>
      <Muted>{t("org.campaigns.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {campaigns === null ? (
        <Loading label={t("org.campaigns.loading")} />
      ) : campaigns.length === 0 ? (
        <Empty>{t("org.campaigns.none")}</Empty>
      ) : (
        campaigns.map((campaign) => (
          <Card key={campaign.id} testID={`campaign-${campaign.code}`}>
            <Row>
              <Body>{campaign.code}</Body>
              <Badge tone={campaign.status === "active" ? "success" : "muted"} text={campaignStatusLabel(t, campaign.status)} />
            </Row>
            <Muted>{campaign.name}</Muted>
            <Muted>
              {campaign.discount_type === "percentage"
                ? t("org.campaigns.off", { amount: `${Number(campaign.discount_value)}%` })
                : t("org.campaigns.off", { amount: formatKZT(campaign.discount_value) })}{" "}
              ·{" "}
              {campaign.max_redemptions
                ? t("org.campaigns.usedOf", { used: campaign.redemption_count, max: campaign.max_redemptions })
                : t("org.campaigns.usedUnlimited", { used: campaign.redemption_count })}
            </Muted>
            <Image source={{ uri: campaignQRURL(campaign.id) }} style={styles.qr} accessibilityLabel={t("org.campaigns.qrAlt", { code: campaign.code })} />
            <Row>
              <KV label={t("org.analytics.orders")} value={String(campaign.orders_count)} />
              <KV label={t("org.analytics.tickets")} value={String(campaign.tickets_sold)} />
              <KV label={t("org.analytics.revenue")} value={formatKZT(campaign.gross_revenue_kzt)} />
              <KV label={t("org.campaigns.discounted")} value={formatKZT(campaign.discount_given_kzt)} />
            </Row>
            <Muted>{campaign.campaign_url}</Muted>
            <Row>
              <Button small variant="secondary" title={t("app.campaigns.share")} onPress={() => void Share.share({ message: campaign.campaign_url })} />
              <Button small variant="secondary" title={t("org.campaigns.downloadQR")} onPress={() => void Linking.openURL(campaignQRURL(campaign.id))} />
              <Button
                small
                variant="secondary"
                title={campaign.status === "active" ? t("org.campaigns.disable") : t("org.campaigns.enable")}
                loading={busyID === campaign.id}
                disabled={busyID !== null || campaign.status === "exhausted"}
                onPress={() => void toggle(campaign)}
              />
              {campaign.redemption_count === 0 ? (
                <Button small variant="danger" title={t("org.types.delete")} disabled={busyID !== null} onPress={() => void remove(campaign)} />
              ) : null}
            </Row>
          </Card>
        ))
      )}

      <Card>
        <Heading>{t("org.campaigns.createHeading")}</Heading>
        {formError ? <Banner tone="error">{formError}</Banner> : null}
        <Field label={t("org.campaigns.name")} value={name} onChangeText={setName} placeholder={t("org.campaigns.namePlaceholder")} error={fieldErrors.name} testID="campaign-name" />
        <Field label={t("org.campaigns.code")} value={code} onChangeText={(value) => setCode(value.toUpperCase())} placeholder="SPRING20" hint={t("org.campaigns.codeHint")} error={fieldErrors.code} autoCapitalize="characters" testID="campaign-code" />
        <Choice<DiscountType>
          label={t("org.campaigns.discountType")}
          options={(["percentage", "fixed_amount"] as const).map((value) => ({ value, label: t(`org.campaigns.types.${value}`) }))}
          value={discountType}
          onChange={setDiscountType}
        />
        <Field
          label={discountType === "percentage" ? t("org.campaigns.percentOff") : t("org.campaigns.kztOff")}
          value={discountValue}
          onChangeText={setDiscountValue}
          error={fieldErrors.discount_value}
          keyboardType="decimal-pad"
        />
        <Field label={t("org.campaigns.maxRedemptions")} value={maxRedemptions} onChangeText={setMaxRedemptions} placeholder={t("org.eventCard.unlimited")} hint={t("org.campaigns.maxHint")} error={fieldErrors.max_redemptions} keyboardType="number-pad" />
        <Field label={t("orgSettings.campaignStarts")} value={startsAt} onChangeText={setStartsAt} hint={`${t("orgSettings.campaignDatesHint")} ${DATE_INPUT_HINT}`} error={fieldErrors.starts_at} autoCapitalize="none" />
        <Field label={t("orgSettings.campaignEnds")} value={endsAt} onChangeText={setEndsAt} hint={DATE_INPUT_HINT} error={fieldErrors.ends_at} autoCapitalize="none" />
        {types.length > 0 ? (
          <>
            <Muted>{t("orgSettings.campaignTypes")}</Muted>
            <Muted>{t("orgSettings.campaignTypesHint")}</Muted>
            {types.map((type) => (
              <Check
                key={type.id}
                label={type.name}
                value={onlyTypes.includes(type.id)}
                onChange={(on) => setOnlyTypes((current) => (on ? [...current, type.id] : current.filter((value) => value !== type.id)))}
              />
            ))}
          </>
        ) : null}
        <Button title={submitting ? t("org.form.creating") : t("org.campaigns.create")} loading={submitting} onPress={() => void create()} testID="campaign-create" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  qr: { width: 160, height: 160, alignSelf: "center", backgroundColor: "#fff", borderRadius: radius.sm },
});
