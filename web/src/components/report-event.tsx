"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField } from "@/components/ui/field";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/context";

/** The reasons the API accepts, in the order of the schema's enum. */
const REASONS = ["fraud", "misleading", "inappropriate", "spam", "copyright", "other"] as const;

/**
 * "Report event" at the foot of the public page (SRS 4.12, BF-100). A quiet
 * secondary control: most visitors never need it. A guest is sent to sign in
 * first, because the API only takes reports from an account.
 */
export function ReportEvent({
  eventID,
  eventSlug,
  organizerID,
}: {
  eventID: string;
  eventSlug: string;
  organizerID: string;
}) {
  const t = useT();
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("misleading");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"sent" | "already" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The API refuses a report on your own event, so the organizer is not offered one.
  if (status === "loading" || user?.id === organizerID) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
    return (
      <Alert tone={done === "sent" ? "success" : "info"}>
        <span data-testid="report-result">{done === "sent" ? t("reportEvent.sent") : t("reportEvent.already")}</span>
      </Alert>
    );
  }

  if (status !== "authenticated") {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/events/${eventSlug}`)}`}
        className="inline-flex text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline"
        data-testid="report-event"
      >
        {t("reportEvent.button")}
      </Link>
    );
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} data-testid="report-event">
        {t("reportEvent.button")}
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg bg-surface p-6 ring-1 ring-border-subtle"
      data-testid="report-form"
    >
      <div>
        <h2 className="text-base font-bold">{t("reportEvent.heading")}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{t("reportEvent.intro")}</p>
      </div>
      <SelectField
        label={t("reportEvent.reason")}
        name="reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        options={REASONS}
        optionLabel={(option) => t(`org.reports.reasons.${option}` as MessageKey)}
        data-testid="report-reason"
      />
      <TextAreaField
        label={t("reportEvent.details")}
        name="details"
        value={details}
        onChange={setDetails}
        placeholder={t("reportEvent.detailsPlaceholder")}
      />
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={submitting} data-testid="report-submit">
          {t("reportEvent.submit")}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
          {t("reportEvent.cancel")}
        </Button>
      </div>
    </form>
  );
}
