import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { Badge, Banner, Body, Button, Card, Choice, Empty, Field, Heading, KV, Loading, Muted, Row, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { DATE_INPUT_HINT, inputToISO } from "../../../lib/date-input";
import { useT } from "../../../lib/i18n/context";
import type { BiletEvent, TicketType, VenueLayoutSection } from "../../../lib/models";
import { formatKZT } from "../../../lib/money";

/** Ticket types: the counts SRS 4.3 asks for, hide/show, delete unsold, add new. */
export default function TicketTypesScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [types, setTypes] = useState<TicketType[] | null>(null);
  const [sections, setSections] = useState<VenueLayoutSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyID, setBusyID] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("5000");
  const [quantity, setQuantity] = useState("5");
  const [maxPerOrder, setMaxPerOrder] = useState("10");
  const [description, setDescription] = useState("");
  const [salesStart, setSalesStart] = useState("");
  const [salesEnd, setSalesEnd] = useState("");
  const [section, setSection] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [loaded, list] = await Promise.all([api.getEvent(id), api.listTicketTypes(id)]);
      setEvent(loaded);
      setTypes(list);
      if (loaded.seating_mode === "assigned_seating" && loaded.venue_id) {
        const venues = await api.listVenues();
        setSections(venues.find((venue) => venue.id === loaded.venue_id)?.sections ?? []);
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.types.loadFailed"));
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!event) return;
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = t("org.types.errName");
    const quantityValue = Number(quantity);
    if (!Number.isInteger(quantityValue) || quantityValue < 0) errors.quantity_total = t("org.types.errQuantity");
    const maxValue = Number(maxPerOrder);
    if (!Number.isInteger(maxValue) || maxValue <= 0) errors.max_per_order = t("org.types.errMax");
    const priceValue = price.trim() === "" ? "0" : price.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(priceValue)) errors.price_kzt = t("org.types.errPrice");
    const startISO = inputToISO(salesStart, event.timezone);
    const endISO = inputToISO(salesEnd, event.timezone);
    if (startISO && endISO && new Date(endISO) <= new Date(startISO)) errors.sales_end_at = t("orgSettings.errSalesOrder");
    if (sections.length > 0 && !section) errors.price_category = t("orgSettings.errSection");
    const chosen = sections.find((item) => item.name === section);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await api.createTicketType(id, {
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(startISO ? { sales_start_at: startISO } : {}),
        ...(endISO ? { sales_end_at: endISO } : {}),
        ...(chosen ? { price_category: chosen.price_category } : {}),
        name: name.trim(),
        price_kzt: priceValue,
        quantity_total: quantityValue,
        max_per_order: maxValue,
      });
      setTypes((current) => [...(current ?? []), created]);
      setName("");
      setDescription("");
      setSalesStart("");
      setSalesEnd("");
      setSection("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setFormError(Object.keys(cause.fields).length > 0 ? t("auth.common.fixFields") : cause.message);
      } else {
        setFormError(t("org.types.createFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleHidden(type: TicketType) {
    setBusyID(type.id);
    try {
      const updated = await api.updateTicketType(type.id, { is_hidden: !type.is_hidden });
      setTypes((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.types.changeFailed"));
    } finally {
      setBusyID(null);
    }
  }

  async function remove(type: TicketType) {
    setBusyID(type.id);
    try {
      await api.deleteTicketType(type.id);
      setTypes((current) => (current ?? []).filter((item) => item.id !== type.id));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.types.deleteFailed"));
    } finally {
      setBusyID(null);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.types.heading") }} />
      <Title>{t("org.types.heading")}</Title>
      <Muted>{t("org.types.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {types === null ? (
        <Loading label={t("org.types.loading")} />
      ) : types.length === 0 ? (
        <Empty>{t("org.types.none")}</Empty>
      ) : (
        types.map((type) => (
          <Card key={type.id} testID={`type-${type.name}`}>
            <Row>
              <Body>{type.name}</Body>
              {type.is_free ? <Badge text={t("tickets.free")} /> : null}
              {type.is_hidden ? <Badge tone="muted" text={t("org.types.hidden")} /> : null}
            </Row>
            <Muted>
              {formatKZT(type.price_kzt)} · {t("org.types.maxPerOrderShort", { max: type.max_per_order })}
            </Muted>
            {type.description ? <Muted>{type.description}</Muted> : null}
            <Row>
              <KV label={t("org.analytics.colSold")} value={String(type.quantity_sold)} />
              <KV label={t("org.types.available")} value={String(type.quantity_remaining)} />
              {type.quantity_reserved > 0 ? <KV label={t("org.types.reserved")} value={String(type.quantity_reserved)} /> : null}
              {type.quantity_refunded > 0 ? <KV label={t("org.analytics.refunded")} value={String(type.quantity_refunded)} /> : null}
              {type.quantity_checked_in > 0 ? <KV label={t("org.analytics.checkedIn")} value={String(type.quantity_checked_in)} /> : null}
              <KV label={t("seatCheckout.total")} value={String(type.quantity_total)} />
            </Row>
            <Row>
              <Button
                small
                variant="secondary"
                title={type.is_hidden ? t("org.types.show") : t("org.types.hide")}
                loading={busyID === type.id}
                disabled={busyID !== null}
                onPress={() => void toggleHidden(type)}
              />
              {type.quantity_sold === 0 ? (
                <Button small variant="danger" title={t("org.types.delete")} disabled={busyID !== null} onPress={() => void remove(type)} />
              ) : null}
            </Row>
          </Card>
        ))
      )}

      <Card>
        <Heading>{t("org.types.addHeading")}</Heading>
        {formError ? <Banner tone="error">{formError}</Banner> : null}
        {sections.length > 0 ? (
          <Choice
            label={t("orgSettings.section")}
            options={sections.map((item) => ({ value: item.name, label: t("orgSettings.sectionOption", { name: item.name, seats: item.seats }) }))}
            value={section}
            onChange={(value) => {
              setSection(value);
              setName(value);
            }}
            hint={t("orgSettings.sectionHint")}
            error={fieldErrors.price_category}
          />
        ) : null}
        <Field label={t("org.types.name")} value={name} onChangeText={setName} placeholder={t("org.types.namePlaceholder")} error={fieldErrors.name} testID="type-name" />
        <Field label={t("org.types.price")} value={price} onChangeText={setPrice} hint={t("org.types.priceHint")} error={fieldErrors.price_kzt} keyboardType="decimal-pad" testID="type-price" />
        <Field label={t("org.types.quantity")} value={quantity} onChangeText={setQuantity} error={fieldErrors.quantity_total} keyboardType="number-pad" testID="type-quantity" />
        <Field label={t("org.types.maxPerOrder")} value={maxPerOrder} onChangeText={setMaxPerOrder} error={fieldErrors.max_per_order} keyboardType="number-pad" />
        <Field label={t("orgSettings.ticketDescription")} value={description} onChangeText={setDescription} placeholder={t("orgSettings.ticketDescriptionPlaceholder")} error={fieldErrors.description} />
        <Field label={t("orgSettings.salesStart")} value={salesStart} onChangeText={setSalesStart} hint={`${t("orgSettings.salesHint")} ${DATE_INPUT_HINT}`} error={fieldErrors.sales_start_at} autoCapitalize="none" />
        <Field label={t("orgSettings.salesEnd")} value={salesEnd} onChangeText={setSalesEnd} hint={DATE_INPUT_HINT} error={fieldErrors.sales_end_at} autoCapitalize="none" />
        <Button title={submitting ? t("org.types.adding") : t("org.types.add")} loading={submitting} onPress={() => void create()} testID="type-add" />
      </Card>
    </Screen>
  );
}
