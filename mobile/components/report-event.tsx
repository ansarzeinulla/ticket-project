import { router } from "expo-router";
import { useState } from "react";

import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import type { MessageKey } from "../lib/i18n/dictionaries";
import { useT } from "../lib/i18n/context";
import { Banner, Button, Card, Choice, Field, Heading, Muted, Row } from "./ui";

/** The reasons the API accepts, in the order of the schema's enum. */
const REASONS = ["fraud", "misleading", "inappropriate", "spam", "copyright", "other"] as const;
type Reason = (typeof REASONS)[number];

/**
 * "Report event" at the foot of the event screen, as on the website (SRS 4.12,
 * BF-100). A guest is sent to sign in first; the login screen comes back here.
 */
export function ReportEvent({ eventID, organizerID }: { eventID: string; organizerID: string }) {
  const t = useT();
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("misleading");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"sent" | "already" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The API refuses a report on your own event, so the organizer is not offered one.
  if (status === "loading" || user?.id === organizerID) return null;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.reportEvent(eventID, reason, details.trim() || undefined);
      setDone("sent");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "already_reported") setDone("already");
      else setError(cause instanceof ApiError ? cause.message : t("reportEvent.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <Banner tone={done === "sent" ? "success" : "info"}>{done === "sent" ? t("reportEvent.sent") : t("reportEvent.already")}</Banner>;
  }

  if (!open) {
    return (
      <Button
        small
        variant="ghost"
        title={t("reportEvent.button")}
        onPress={() => (status === "signedIn" ? setOpen(true) : router.push("/login"))}
        testID="report-event"
      />
    );
  }

  return (
    <Card>
      <Heading>{t("reportEvent.heading")}</Heading>
      <Muted>{t("reportEvent.intro")}</Muted>
      <Choice<Reason>
        label={t("reportEvent.reason")}
        options={REASONS.map((value) => ({ value, label: t(`org.reports.reasons.${value}` as MessageKey) }))}
        value={reason}
        onChange={setReason}
      />
      <Field
        label={t("reportEvent.details")}
        value={details}
        onChangeText={setDetails}
        placeholder={t("reportEvent.detailsPlaceholder")}
        multiline
        testID="report-details"
      />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Row>
        <Button small title={t("reportEvent.submit")} onPress={() => void submit()} loading={submitting} testID="report-submit" />
        <Button small variant="secondary" title={t("reportEvent.cancel")} onPress={() => setOpen(false)} disabled={submitting} />
      </Row>
    </Card>
  );
}
