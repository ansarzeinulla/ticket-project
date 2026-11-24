"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ActivationChecklist } from "@/components/activation-checklist";
import { AttendeeList } from "@/components/attendee-list";
import { CampaignManager } from "@/components/campaign-manager";
import { EventAnalyticsPanel } from "@/components/event-analytics";
import { EventTimeline } from "@/components/event-timeline";
import { OrderManager } from "@/components/order-manager";
import { StaffManager } from "@/components/staff-manager";
import { SupportInbox } from "@/components/support-inbox";
import { TicketTypeManager } from "@/components/ticket-type-manager";
import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { LIFECYCLE_LABELS, StatusBadge } from "@/components/ui/status-badge";
import { ApiError, api } from "@/lib/api";
import { formatInTimezone } from "@/lib/datetime";
import { useT } from "@/lib/i18n/context";
import type { BiletEvent, TicketType, VenueLayoutSection } from "@/lib/types";

export function EventDetail({ eventID }: { eventID: string }) {
  // Bumped when something elsewhere on the page changes the figures - a
  // refund, or paid sales opening - so the analytics panel re-reads rather
  // than showing numbers the organizer just invalidated.
  const [refreshKey, setRefreshKey] = useState(0);

  const router = useRouter();
  const t = useT();
  const [sections, setSections] = useState<VenueLayoutSection[]>([]);

  const [event, setEvent] = useState<BiletEvent | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [loaded, types] = await Promise.all([
        api.getEvent(eventID, signal),
        api.listTicketTypes(eventID, signal),
      ]);
      setEvent(loaded);
      setTicketTypes(types);
      // A seated event's ticket types are matched to its venue's sections.
      if (loaded.seating_mode === "assigned_seating" && loaded.venue_id) {
        const venues = await api.listVenues(signal);
        setSections(venues.find((venue) => venue.id === loaded.venue_id)?.sections ?? []);
      } else {
        setSections([]);
      }
      setError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof ApiError ? cause.message : t("org.detail.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [eventID, t]);

  /**
   * Copies the event's setup into a new draft and opens it (SRS 4.16).
   *
   * The copy carries the title, description, venue and ticket type definitions;
   * orders, tickets, check-ins and support cases stay with the original.
   */
  async function handleDuplicate() {
    setDuplicating(true);
    setError(null);
    try {
      const copy = await api.duplicateEvent(eventID);
      router.push(`/dashboard/events/${copy.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.detail.duplicateFailed"));
      setDuplicating(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-foreground-muted">
        <Spinner />
        {t("org.detail.loading")}
      </div>
    );
  }

  if (error || !event) {
    return <Alert tone="error">{error ?? t("org.detail.notFound")}</Alert>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-foreground-muted hover:underline">
          {t("org.detail.back")}
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <StatusBadge status={event.status} />
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium capitalize text-foreground-muted">
            {t(LIFECYCLE_LABELS[event.lifecycle])}
          </span>

          <div className="ml-auto">
            <Button
              variant="secondary"
              size="sm"
              loading={duplicating}
              onClick={() => void handleDuplicate()}
              data-testid="duplicate-event"
            >
              {t("org.detail.duplicate")}
            </Button>
          </div>
          {event.status !== "published" && (
            <Link
              href={`/dashboard/events/${event.id}/preview`}
              className="inline-flex items-center rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
              data-testid="preview-event"
            >
              {t("orgSettings.preview")}
            </Link>
          )}
        </div>

        {event.duplicated_from_event_id && (
          <p className="mt-2 text-xs text-foreground-muted">
            {t("org.detail.duplicatedFrom")}{" "}
            <Link
              href={`/dashboard/events/${event.duplicated_from_event_id}`}
              className="text-brand hover:underline"
            >
              {t("org.detail.earlierEvent")}
            </Link>
            .
          </p>
        )}

        <p className="mt-1 font-mono text-xs text-foreground-muted">/{event.slug}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-foreground-muted">{t("org.eventCard.starts")}</dt>
            <dd className="mt-0.5">{formatInTimezone(event.starts_at, event.timezone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">{t("org.eventCard.ends")}</dt>
            <dd className="mt-0.5">{formatInTimezone(event.ends_at, event.timezone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">{t("org.eventCard.timezone")}</dt>
            <dd className="mt-0.5">{event.timezone}</dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">{t("org.eventCard.capacity")}</dt>
            <dd className="mt-0.5">{event.capacity ?? t("org.eventCard.unlimited")}</dd>
          </div>
        </dl>

        {event.status === "suspended" ? (
          <Alert tone="error" title={t("org.detail.suspendedTitle")}>
            {t("org.detail.suspendedBody")}
          </Alert>
        ) : event.status === "published" ? (
          <p className="mt-4 text-sm">
            <Link
              href={`/events/${event.slug}`}
              className="font-medium text-brand hover:underline"
            >
              {t("org.detail.viewPublic")}
            </Link>
          </p>
        ) : (
          <Alert tone="info">
            {t("org.detail.notPublished", { status: t(`org.status.${event.status}`) })}
          </Alert>
        )}
      </div>

      {/*
        Activation sits above the numbers: an organizer whose paid tickets are
        not on sale needs to know that before they wonder why nothing has sold.
        It renders nothing at all for a free event.
      */}
      <ActivationChecklist eventID={event.id} onActivated={() => setRefreshKey((n) => n + 1)} />

      <EventAnalyticsPanel
        key={`analytics-${refreshKey}`}
        eventID={event.id}
        ticketTypes={ticketTypes}
      />

      <OrderManager
        eventID={event.id}
        onRefunded={() => setRefreshKey((n) => n + 1)}
      />

      {/*
        Keyed on the same counter as the analytics: a refund returns inventory,
        so leaving this panel showing the pre-refund "sold" would contradict
        the numbers directly above it.
      */}
      <TicketTypeManager
        key={`types-${refreshKey}`}
        eventID={event.id}
        timezone={event.timezone}
        sections={sections}
      />

      <AttendeeList key={`attendees-${refreshKey}`} eventID={event.id} />

      <StaffManager eventID={event.id} />

      <CampaignManager eventID={event.id} timezone={event.timezone} ticketTypes={ticketTypes} />

      <SupportInbox eventID={event.id} />

      <EventTimeline eventID={event.id} />
    </div>
  );
}
