import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";

import { ActivationChecklist } from "../../../components/manage/activation";
import { Badge, Banner, Button, Card, Heading, KV, Loading, Muted, Row, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { formatInTimezone } from "../../../lib/datetime";
import { useT } from "../../../lib/i18n/context";
import type { MessageKey } from "../../../lib/i18n/dictionaries";
import { eventStatusLabel, lifecycleLabel } from "../../../lib/labels";
import type { BiletEvent } from "../../../lib/models";

/** Each part of the website's event dashboard is its own screen in the app. */
const SECTIONS: { path: string; label: MessageKey; testID: string }[] = [
  { path: "analytics", label: "org.analytics.heading", testID: "section-analytics" },
  { path: "orders", label: "org.orders.heading", testID: "section-orders" },
  { path: "tickets", label: "org.types.heading", testID: "section-tickets" },
  { path: "attendees", label: "org.attendees.heading", testID: "section-attendees" },
  { path: "staff", label: "org.staff.heading", testID: "section-staff" },
  { path: "campaigns", label: "org.campaigns.heading", testID: "section-campaigns" },
  { path: "support", label: "orderSupport.heading", testID: "section-support" },
  { path: "timeline", label: "org.timeline.heading", testID: "section-timeline" },
];

export default function ManageEventScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [busy, setBusy] = useState<null | "publish" | "unpublish" | "cancel" | "duplicate">(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvent(await api.getEvent(id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.detail.loadFailed"));
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(action: "publish" | "unpublish" | "cancel") {
    setBusy(action);
    setError(null);
    setNeedsEmail(false);
    try {
      const updated =
        action === "publish"
          ? await api.publishEvent(id)
          : action === "unpublish"
            ? await api.unpublishEvent(id)
            : await api.cancelEvent(id);
      setEvent(updated);
      setConfirmingCancel(false);
    } catch (cause) {
      // SRS UC1: an unconfirmed address cannot publish; the code is on the Profile screen.
      if (cause instanceof ApiError && cause.code === "email_unverified") setNeedsEmail(true);
      else setError(cause instanceof ApiError ? cause.message : t("org.eventCard.actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    setBusy("duplicate");
    setError(null);
    try {
      const copy = await api.duplicateEvent(id);
      router.push(`/manage/${copy.id}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.detail.duplicateFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (!event) {
    return <Screen>{error ? <Banner tone="error">{error}</Banner> : <Loading label={t("org.detail.loading")} />}</Screen>;
  }

  const canPublish = event.status === "draft" || event.status === "unpublished";
  const canUnpublish = event.status === "published";
  const canCancel = event.status !== "cancelled" && event.status !== "completed";

  return (
    <Screen>
      <Stack.Screen options={{ title: event.title }} />
      <Title>{event.title}</Title>
      <Row>
        <Badge text={eventStatusLabel(t, event.status)} />
        <Badge tone="muted" text={lifecycleLabel(t, event.lifecycle)} />
      </Row>
      <Muted>/{event.slug}</Muted>
      {event.duplicated_from_event_id ? (
        <Button
          small
          variant="ghost"
          title={`${t("org.detail.duplicatedFrom")} ${t("org.detail.earlierEvent")}`}
          onPress={() => router.push(`/manage/${event.duplicated_from_event_id}`)}
        />
      ) : null}

      <Card>
        <KV label={t("org.eventCard.starts")} value={formatInTimezone(event.starts_at, event.timezone)} />
        <KV label={t("org.eventCard.ends")} value={formatInTimezone(event.ends_at, event.timezone)} />
        <KV label={t("org.eventCard.timezone")} value={event.timezone} />
        <KV label={t("org.eventCard.capacity")} value={event.capacity == null ? t("org.eventCard.unlimited") : String(event.capacity)} />
      </Card>

      {event.status === "suspended" ? (
        <Banner tone="error" title={t("org.detail.suspendedTitle")}>{t("org.detail.suspendedBody")}</Banner>
      ) : event.status === "published" ? (
        <Button variant="secondary" title={t("org.detail.viewPublic")} onPress={() => router.push(`/event/${event.slug}`)} />
      ) : (
        <Banner>{t("org.detail.notPublished", { status: eventStatusLabel(t, event.status) })}</Banner>
      )}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {needsEmail ? (
        <>
          <Banner tone="error">{t("home.publishNeedsEmail")}</Banner>
          <Button variant="outline" title={t("home.verifyGo")} onPress={() => router.push("/profile")} testID="publish-needs-email" />
        </>
      ) : null}

      <Row>
        <Button small variant="secondary" title={t("org.eventCard.edit")} onPress={() => router.push(`/event-form?id=${event.id}`)} testID="edit-event" />
        {event.status !== "published" ? (
          <Button small variant="secondary" title={t("orgSettings.preview")} onPress={() => router.push(`/manage/${event.id}/preview`)} testID="preview-event" />
        ) : null}
        {canPublish ? (
          <Button small title={t("org.eventCard.publish")} loading={busy === "publish"} disabled={busy !== null} onPress={() => void run("publish")} testID="publish-event" />
        ) : null}
        {canUnpublish ? (
          <Button small variant="secondary" title={t("org.eventCard.unpublish")} loading={busy === "unpublish"} disabled={busy !== null} onPress={() => void run("unpublish")} testID="unpublish-event" />
        ) : null}
        <Button small variant="secondary" title={t("org.detail.duplicate")} loading={busy === "duplicate"} disabled={busy !== null} onPress={() => void duplicate()} testID="duplicate-event" />
        {canCancel && !confirmingCancel ? (
          <Button small variant="danger" title={t("org.eventCard.cancel")} disabled={busy !== null} onPress={() => setConfirmingCancel(true)} testID="cancel-event" />
        ) : null}
      </Row>
      {confirmingCancel ? (
        <Card>
          <Banner tone="error">{t("org.eventCard.cancelWarnBefore") + event.title + t("org.eventCard.cancelWarnAfter")}</Banner>
          <Row>
            <Button small variant="danger" title={t("org.eventCard.cancelConfirm")} loading={busy === "cancel"} onPress={() => void run("cancel")} testID="cancel-confirm" />
            <Button small variant="ghost" title={t("org.eventCard.keep")} onPress={() => setConfirmingCancel(false)} />
          </Row>
        </Card>
      ) : null}

      <ActivationChecklist eventID={event.id} onActivated={() => void load()} />

      <Heading>{t("app.manage.sections")}</Heading>
      {SECTIONS.map((section) => (
        <Card key={section.path} onPress={() => router.push(`/manage/${event.id}/${section.path}`)} testID={section.testID}>
          <Muted>{t(section.label)} ›</Muted>
        </Card>
      ))}
    </Screen>
  );
}
