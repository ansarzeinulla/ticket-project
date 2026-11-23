"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { formatInTimezone } from "@/lib/datetime";
import { useT } from "@/lib/i18n/context";
import { formatKZT } from "@/lib/money";
import type { BiletEvent, TicketType } from "@/lib/types";

/**
 * The organizer's preview of the public event page.
 *
 * The public page itself refuses a draft (it must, or anyone could read an
 * unannounced event by guessing its slug), so the preview reads the event
 * through the organizer's own API instead and lays it out the same way.
 */
export function EventPreview({ eventID }: { eventID: string }) {
  const t = useT();
  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.getEvent(eventID, controller.signal),
      api.listTicketTypes(eventID, controller.signal),
    ])
      .then(([loaded, loadedTypes]) => {
        setEvent(loaded);
        setTypes(loadedTypes.filter((type) => !type.is_hidden));
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.detail.loadFailed"));
      });
    return () => controller.abort();
  }, [eventID, t]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!event) {
    return (
      <p className="flex items-center gap-2 text-sm text-foreground-muted">
        <Spinner aria-hidden /> {t("org.detail.loading")}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/dashboard/events/${event.id}`}
        className="text-sm text-foreground-muted hover:underline"
      >
        {t("org.form.backTo", { title: event.title })}
      </Link>

      <Alert tone="info" title={t("orgSettings.previewTitle")}>
        {t("orgSettings.previewBody")}
      </Alert>

      <article className="space-y-6 rounded-xl border border-border-subtle bg-surface p-6" data-testid="event-preview">
        {event.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt=""
            className="max-h-64 w-full rounded-lg object-cover"
          />
        )}
        <div>
          {event.category && (
            <p className="text-xs font-medium uppercase tracking-wide text-brand">{event.category}</p>
          )}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{event.title}</h1>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-foreground-muted">{t("eventPage.when")}</dt>
            <dd className="mt-0.5">
              {formatInTimezone(event.starts_at, event.timezone)}
              <span className="block text-xs text-foreground-muted">
                {t("eventPage.until", {
                  time: formatInTimezone(event.ends_at, event.timezone),
                  tz: event.timezone,
                })}
              </span>
            </dd>
          </div>
          {(event.venue_name || event.venue_address) && (
            <div>
              <dt className="text-xs text-foreground-muted">{t("eventPage.where")}</dt>
              <dd className="mt-0.5">
                {event.venue_name}
                {event.venue_address && (
                  <span className="block text-xs text-foreground-muted">{event.venue_address}</span>
                )}
              </dd>
            </div>
          )}
        </dl>

        {event.description && <p className="whitespace-pre-line text-sm">{event.description}</p>}

        <section>
          <h2 className="text-sm font-semibold">{t("tickets.heading")}</h2>
          {types.length === 0 ? (
            <p className="mt-2 text-sm text-foreground-muted">{t("tickets.none")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {types.map((type) => (
                <li key={type.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{type.name}</span>
                    {type.description && (
                      <span className="block text-xs text-foreground-muted">{type.description}</span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums">
                    {type.is_free ? t("tickets.free") : formatKZT(type.price_kzt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {event.refund_policy && (
          <section>
            <h2 className="text-sm font-semibold">{t("eventPage.refundPolicy")}</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground-muted">{event.refund_policy}</p>
          </section>
        )}
      </article>
    </div>
  );
}
