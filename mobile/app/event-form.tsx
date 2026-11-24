import * as ImagePicker from "expo-image-picker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet } from "react-native";

import { Banner, Button, Card, Choice, Field, Heading, Loading, Muted, Row, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import { DATE_INPUT_HINT, inputToISO, isoToInput } from "../lib/date-input";
import { slugify, timezoneOptions } from "../lib/datetime";
import { useT } from "../lib/i18n/context";
import type { BiletEvent, VenueLayout } from "../lib/models";
import { radius, theme } from "../lib/theme";

/** The Kazakhstan zones, offered as one-tap choices; any IANA zone can be typed. */
const KZ_ZONES = ["Asia/Almaty", "Asia/Aqtobe", "Asia/Aqtau", "Asia/Atyrau", "Asia/Oral", "Asia/Qostanay", "Asia/Qyzylorda"];
type Visibility = "public" | "unlisted" | "private";
type Seating = "general_admission" | "assigned_seating";

interface Values {
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: string;
  description: string;
  category: string;
  visibility: Visibility;
  venueName: string;
  venueAddress: string;
  refundPolicy: string;
  coverImageURL: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  seatingMode: Seating;
  venueID: string;
}

function inDays(days: number, hour: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hour)}:00`;
}

function fromEvent(event: BiletEvent): Values {
  return {
    title: event.title,
    slug: event.slug,
    startsAt: isoToInput(event.starts_at, event.timezone),
    endsAt: isoToInput(event.ends_at, event.timezone),
    timezone: event.timezone,
    capacity: event.capacity == null ? "" : String(event.capacity),
    description: event.description ?? "",
    category: event.category ?? "",
    visibility: event.visibility,
    venueName: event.venue_name ?? "",
    venueAddress: event.venue_address ?? "",
    refundPolicy: event.refund_policy ?? "",
    coverImageURL: event.cover_image_url ?? "",
    registrationOpensAt: isoToInput(event.registration_opens_at, event.timezone),
    registrationClosesAt: isoToInput(event.registration_closes_at, event.timezone),
    seatingMode: event.seating_mode,
    venueID: event.venue_id ?? "",
  };
}

/**
 * Create or edit an event (SRS 4.2) - every field the website's form has.
 * Opened as /event-form for a new draft, /event-form?id=... to edit.
 */
export default function EventFormScreen() {
  const t = useT();
  const { refresh } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === "string" && id.length > 0;
  const zones = useMemo(() => timezoneOptions(), []);

  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [values, setValues] = useState<Values | null>(
    editing
      ? null
      : {
          title: "", slug: "", startsAt: inDays(30, 19), endsAt: inDays(30, 22), timezone: "Asia/Almaty",
          capacity: "200", description: "", category: "", visibility: "public", venueName: "",
          venueAddress: "", refundPolicy: "", coverImageURL: "", registrationOpensAt: "",
          registrationClosesAt: "", seatingMode: "general_admission", venueID: "",
        },
  );
  const [venues, setVenues] = useState<VenueLayout[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.listVenues().then(setVenues).catch(() => setVenues([]));
    if (!editing) return;
    api
      .getEvent(id)
      .then((loaded) => {
        setEvent(loaded);
        setValues(fromEvent(loaded));
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : t("org.detail.loadFailed")));
  }, [editing, id, t]);

  if (!values) {
    return <Screen>{error ? <Banner tone="error">{error}</Banner> : <Loading label={t("org.form.loadingEvent")} />}</Screen>;
  }

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  };
  const slugLocked = editing && (event?.status === "published" || event?.status === "suspended");

  async function pickBanner() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      setError(t("org.upload.tooLarge"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadImage({
        uri: asset.uri,
        name: asset.fileName ?? "banner.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      set("coverImageURL", uploaded.url);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.upload.failed"));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!values) return;
    const errors: Record<string, string> = {};
    if (!values.title.trim()) errors.title = t("org.form.errTitle");
    if (!zones.includes(values.timezone)) errors.timezone = DATE_INPUT_HINT;
    const startsISO = inputToISO(values.startsAt, values.timezone);
    const endsISO = inputToISO(values.endsAt, values.timezone);
    if (!startsISO) errors.starts_at = t("org.form.errStarts");
    if (!endsISO) errors.ends_at = t("org.form.errEnds");
    if (startsISO && endsISO && new Date(endsISO) <= new Date(startsISO)) errors.ends_at = t("org.form.errOrder");
    const capacity = values.capacity.trim();
    if (capacity !== "" && (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0)) {
      errors.capacity = t("org.form.errCapacity");
    }
    const opensISO = inputToISO(values.registrationOpensAt, values.timezone);
    const closesISO = inputToISO(values.registrationClosesAt, values.timezone);
    if (opensISO && closesISO && new Date(closesISO) <= new Date(opensISO)) {
      errors.registration_closes_at = t("orgSettings.errRegistrationOrder");
    }
    if (values.seatingMode === "assigned_seating" && !values.venueID) errors.venue_id = t("orgSettings.errVenue");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    const optional = (text: string) => (text.trim() ? text.trim() : undefined);
    try {
      if (!editing) {
        const created = await api.createEvent({
          title: values.title.trim(),
          starts_at: startsISO as string,
          ends_at: endsISO as string,
          timezone: values.timezone,
          visibility: values.visibility,
          ...(values.slug.trim() ? { slug: slugify(values.slug) } : {}),
          ...(capacity ? { capacity: Number(capacity) } : {}),
          description: optional(values.description),
          category: optional(values.category),
          venue_name: optional(values.venueName),
          venue_address: optional(values.venueAddress),
          refund_policy: optional(values.refundPolicy),
          cover_image_url: values.coverImageURL || undefined,
          ...(opensISO ? { registration_opens_at: opensISO } : {}),
          ...(closesISO ? { registration_closes_at: closesISO } : {}),
          ...(values.seatingMode === "assigned_seating" ? { seating_mode: "assigned_seating" as const, venue_id: values.venueID } : {}),
        });
        void refresh();
        router.replace(`/manage/${created.id}`);
        return;
      }
      if (!event) return;
      const before = fromEvent(event);
      const patch: Record<string, unknown> = {};
      if (values.title.trim() !== before.title) patch.title = values.title.trim();
      if (values.timezone !== before.timezone) patch.timezone = values.timezone;
      if (values.visibility !== before.visibility) patch.visibility = values.visibility;
      if (startsISO && startsISO !== event.starts_at) patch.starts_at = startsISO;
      if (endsISO && endsISO !== event.ends_at) patch.ends_at = endsISO;
      if (!slugLocked && slugify(values.slug) !== before.slug) patch.slug = slugify(values.slug);
      if (capacity !== before.capacity) patch.capacity = capacity === "" ? null : Number(capacity);
      if (values.registrationOpensAt !== before.registrationOpensAt) patch.registration_opens_at = opensISO;
      if (values.registrationClosesAt !== before.registrationClosesAt) patch.registration_closes_at = closesISO;
      if (values.seatingMode !== before.seatingMode || values.venueID !== before.venueID) {
        patch.seating_mode = values.seatingMode;
        patch.venue_id = values.seatingMode === "assigned_seating" ? values.venueID : null;
      }
      for (const [key, now, was] of [
        ["description", values.description, before.description],
        ["category", values.category, before.category],
        ["venue_name", values.venueName, before.venueName],
        ["venue_address", values.venueAddress, before.venueAddress],
        ["refund_policy", values.refundPolicy, before.refundPolicy],
        ["cover_image_url", values.coverImageURL, before.coverImageURL],
      ] as const) {
        if (now.trim() !== was) patch[key] = now.trim() === "" ? null : now.trim();
      }
      if (Object.keys(patch).length === 0) {
        setError(t("org.form.nothingChanged"));
        return;
      }
      const updated = await api.updateEvent(event.id, patch);
      setEvent(updated);
      setValues(fromEvent(updated));
      setSaved(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(Object.keys(cause.fields).length > 0 ? t("auth.common.fixFields") : cause.message);
      } else {
        setError(t("auth.common.genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const slugPreview = values.slug.trim() ? slugify(values.slug) : slugify(values.title) || "your-event";

  return (
    <Screen>
      <Stack.Screen options={{ title: editing ? t("org.form.editHeading") : t("org.titles.newEvent") }} />
      <Title>{editing ? t("org.form.editHeading") : t("org.titles.newEvent")}</Title>
      <Muted>
        {editing
          ? event?.status === "published"
            ? t("org.form.liveNote")
            : t("org.form.draftNote")
          : t("org.form.createSubtitle")}
      </Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {saved ? <Banner tone="success">{t("org.form.saved")}</Banner> : null}

      <Field label={t("org.form.title")} value={values.title} onChangeText={(v) => set("title", v)} placeholder="Almaty Winter Jazz Night" error={fieldErrors.title} testID="event-title" />
      {slugLocked ? (
        <Card>
          <Muted>{t("org.form.slug")}: /{values.slug}</Muted>
          <Muted>{t("org.form.slugLocked")}</Muted>
        </Card>
      ) : (
        <Field
          label={t("org.form.slug")}
          value={values.slug}
          onChangeText={(v) => set("slug", v)}
          placeholder={t("org.form.slugPlaceholder")}
          hint={`${t("org.form.slugPreview")} /${slugPreview}`}
          error={fieldErrors.slug}
          autoCapitalize="none"
        />
      )}
      <Field label={t("org.form.startsAt")} value={values.startsAt} onChangeText={(v) => set("startsAt", v)} hint={DATE_INPUT_HINT} error={fieldErrors.starts_at} autoCapitalize="none" />
      <Field label={t("org.form.endsAt")} value={values.endsAt} onChangeText={(v) => set("endsAt", v)} hint={DATE_INPUT_HINT} error={fieldErrors.ends_at} autoCapitalize="none" />
      <Field label={t("org.eventCard.timezone")} value={values.timezone} onChangeText={(v) => set("timezone", v)} hint={t("org.form.timezoneHint")} error={fieldErrors.timezone} autoCapitalize="none" />
      <Choice options={KZ_ZONES.map((zone) => ({ value: zone, label: zone.replace("Asia/", "") }))} value={values.timezone} onChange={(v) => set("timezone", v)} />
      <Field label={t("org.eventCard.capacity")} value={values.capacity} onChangeText={(v) => set("capacity", v)} hint={t("org.form.capacityHint")} error={fieldErrors.capacity} keyboardType="number-pad" />

      <Heading>{t("org.form.optional")}</Heading>
      <Card>
        <Muted>{t("org.upload.label")}</Muted>
        {values.coverImageURL ? (
          <Image source={{ uri: values.coverImageURL }} style={styles.banner} accessibilityLabel={t("org.upload.alt")} />
        ) : (
          <Muted>{t("org.upload.tip")}</Muted>
        )}
        <Row>
          <Button small variant="secondary" title={values.coverImageURL ? t("org.upload.replace") : t("org.upload.choose")} loading={uploading} onPress={() => void pickBanner()} />
          {values.coverImageURL ? <Button small variant="ghost" title={t("org.upload.remove")} onPress={() => set("coverImageURL", "")} /> : null}
        </Row>
        <Muted>{t("org.upload.formats")}</Muted>
      </Card>
      <Field label={t("orgSettings.registrationOpens")} value={values.registrationOpensAt} onChangeText={(v) => set("registrationOpensAt", v)} hint={`${t("orgSettings.registrationHint")} ${DATE_INPUT_HINT}`} error={fieldErrors.registration_opens_at} autoCapitalize="none" />
      <Field label={t("orgSettings.registrationCloses")} value={values.registrationClosesAt} onChangeText={(v) => set("registrationClosesAt", v)} hint={DATE_INPUT_HINT} error={fieldErrors.registration_closes_at} autoCapitalize="none" />
      <Choice<Seating>
        label={t("orgSettings.seating")}
        options={[
          { value: "general_admission", label: t("orgSettings.seatingModes.general_admission") },
          { value: "assigned_seating", label: t("orgSettings.seatingModes.assigned_seating") },
        ]}
        value={values.seatingMode}
        onChange={(v) => set("seatingMode", v)}
      />
      {values.seatingMode === "assigned_seating" ? (
        <Choice
          label={t("orgSettings.venueLayout")}
          options={venues.map((venue) => ({ value: venue.id, label: t("orgSettings.venueOption", { name: venue.name, seats: venue.seats }) }))}
          value={values.venueID}
          onChange={(v) => set("venueID", v)}
          hint={t("orgSettings.venueHint")}
          error={fieldErrors.venue_id}
        />
      ) : null}
      <Field label={t("org.form.refundPolicy")} value={values.refundPolicy} onChangeText={(v) => set("refundPolicy", v)} placeholder={t("org.form.refundPlaceholder")} hint={t("org.form.refundHint")} multiline />
      <Field label={t("org.form.description")} value={values.description} onChangeText={(v) => set("description", v)} placeholder={t("org.form.descriptionPlaceholder")} multiline />
      <Field label={t("org.form.category")} value={values.category} onChangeText={(v) => set("category", v)} placeholder="music" autoCapitalize="none" />
      <Choice<Visibility>
        label={t("org.form.visibility")}
        options={(["public", "unlisted", "private"] as const).map((value) => ({ value, label: t(`org.form.visibilities.${value}`) }))}
        value={values.visibility}
        onChange={(v) => set("visibility", v)}
      />
      <Field label={t("org.form.venueName")} value={values.venueName} onChangeText={(v) => set("venueName", v)} placeholder="Almaty Demo Hall" />
      <Field label={t("org.form.venueAddress")} value={values.venueAddress} onChangeText={(v) => set("venueAddress", v)} placeholder="Abay Avenue 44, Almaty" />

      <Button
        title={editing ? (submitting ? t("org.form.saving") : t("org.form.save")) : submitting ? t("org.form.creating") : t("org.form.create")}
        loading={submitting}
        onPress={() => void submit()}
        testID="save-event"
      />
      <Button variant="ghost" title={editing ? t("org.form.discard") : t("org.form.cancel")} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { width: "100%", height: 140, borderRadius: radius.sm, backgroundColor: theme.surfaceAlt },
});
