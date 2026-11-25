"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LIFECYCLE_LABELS, StatusBadge } from "@/components/ui/status-badge";
import { ApiError, api } from "@/lib/api";
import { formatInTimezone } from "@/lib/datetime";
import { mediaURL } from "@/lib/media";
import { useI18n } from "@/lib/i18n/context";
import type { BiletEvent } from "@/lib/types";

export function EventCard({
  event,
  onChanged,
}: {
  event: BiletEvent;
  onChanged: (updated: BiletEvent) => void;
}) {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState<null | "publish" | "unpublish" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function run(action: "publish" | "unpublish" | "cancel") {
    setBusy(action);
    setError(null);
    setNeedsEmail(false);
    try {
      const updated =
        action === "publish"
          ? await api.publishEvent(event.id)
          : action === "unpublish"
            ? await api.unpublishEvent(event.id)
            : await api.cancelEvent(event.id);
      onChanged(updated);
      setConfirmingCancel(false);
    } catch (cause) {
      // SRS UC1: an unconfirmed address cannot publish; the code is on the profile page.
      if (cause instanceof ApiError && cause.code === "email_unverified") setNeedsEmail(true);
      else setError(cause instanceof ApiError ? cause.message : t("org.eventCard.actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  const canPublish = event.status === "draft" || event.status === "unpublished";
  // SRS 4.2 lists unpublish alongside publish. It takes the page down while
  // the organizer reworks the event, and - unlike cancelling - it is
  // reversible and tells nobody.
  const canUnpublish = event.status === "published";
  const canCancel = event.status !== "cancelled" && event.status !== "completed";

  return (
    <li className="rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex gap-4">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md bg-surface-muted sm:w-20"
          tabIndex={-1}
          aria-hidden
        >
          {event.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaURL(event.cover_image_url)} alt="" className="h-full w-full object-cover" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-semibold">
              <Link href={`/dashboard/events/${event.id}`} className="hover:text-brand">
                {event.title}
              </Link>
            </h3>
            <StatusBadge status={event.status} />
            {/* The lifecycle only when it adds something: "Completed Completed" says nothing twice. */}
            {event.lifecycle !== event.status && (
              <span className="rounded bg-surface-muted px-2 py-0.5 text-xs capitalize text-foreground-muted">
                {t(LIFECYCLE_LABELS[event.lifecycle])}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground-muted">
            {formatInTimezone(event.starts_at, event.timezone, locale)}
            {event.venue_name ? `, ${event.venue_name}` : ""}
            {", "}
            {t("org.eventCard.capacity").toLowerCase()} {event.capacity ?? t("org.eventCard.unlimited")}
          </p>

          {/* No shrink-0: on a phone the buttons wrap under the title instead of
              pushing the card past the screen edge. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/events/${event.id}`}
              className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-strong"
            >
              {t("org.eventCard.manage")}
            </Link>
            <Link
              href={`/dashboard/events/${event.id}/edit`}
              className="inline-flex items-center rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-foreground-muted"
              data-testid="edit-event"
            >
              {t("org.eventCard.edit")}
            </Link>
            {event.status === "published" && (
              <Link
                href={`/events/${event.slug}`}
                className="inline-flex items-center rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium hover:border-foreground-muted"
              >
                {t("org.eventCard.publicPage")}
              </Link>
            )}
            {canPublish && (
              <Button size="sm" variant="secondary" loading={busy === "publish"} disabled={busy !== null} onClick={() => run("publish")}>
                {t("org.eventCard.publish")}
              </Button>
            )}
            {canUnpublish && (
              <Button
                size="sm"
                variant="secondary"
                loading={busy === "unpublish"}
                disabled={busy !== null}
                onClick={() => run("unpublish")}
                data-testid="unpublish-event"
              >
                {t("org.eventCard.unpublish")}
              </Button>
            )}
            {canCancel && !confirmingCancel && (
              <Button size="sm" variant="ghost" className="text-danger" disabled={busy !== null} onClick={() => setConfirmingCancel(true)}>
                {t("org.eventCard.cancel")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/*
        Cancelling is final and emails every ticket holder, so it does not fire
        on a single click. Unpublishing is the reversible action, and it is
        offered right here so the destructive one is never the only way to take
        a page down.
      */}
      {confirmingCancel && (
        <div className="mt-4 space-y-2 rounded-lg border border-danger/30 bg-danger-soft/40 p-3">
          <p className="text-sm">
            {t("org.eventCard.cancelWarnBefore")}<strong>{event.title}</strong>
            {t("org.eventCard.cancelWarnAfter")}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              loading={busy === "cancel"}
              disabled={busy !== null}
              onClick={() => run("cancel")}
            >
              {t("org.eventCard.cancelConfirm")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingCancel(false)}>
              {t("org.eventCard.keep")}
            </Button>
          </div>
        </div>
      )}


      {error && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {needsEmail && (
        <p className="mt-3 text-sm text-danger" role="alert" data-testid="publish-needs-email">
          {t("home.publishNeedsEmail")}{" "}
          <Link href="/dashboard/profile#confirm-email" className="font-semibold text-brand-strong underline">
            {t("home.verifyGo")}
          </Link>
        </p>
      )}
    </li>
  );
}
