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
import { mediaURL } from "@/lib/media";
import { useI18n, useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { BiletEvent, TicketType, VenueLayoutSection } from "@/lib/types";

export function EventDetail({ eventID }: { eventID: string }) {
  // Bumped when something elsewhere on the page changes the figures - a
  // refund, or paid sales opening - so the analytics panel re-reads rather
  // than showing numbers the organizer just invalidated.
  const [refreshKey, setRefreshKey] = useState(0);

  const router = useRouter();
  const { t, locale } = useI18n();
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

        {/* The event at a glance (BF-100): poster, title, status, when, actions. */}
        <div className="mt-3 flex gap-5 rounded-lg bg-surface p-4 ring-1 ring-border-subtle sm:p-5">
          {event.cover_image_url && (
            <div className="aspect-[2/3] w-20 shrink-0 self-start overflow-hidden rounded-md bg-surface-muted sm:w-28">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaURL(event.cover_image_url)} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              {event.lifecycle !== event.status && (
                <span className="rounded bg-surface-muted px-2.5 py-0.5 text-xs font-medium capitalize text-foreground-muted">
                  {t(LIFECYCLE_LABELS[event.lifecycle])}
                </span>
              )}
            </div>
            <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl">{event.title}</h1>
            <p className="text-sm text-foreground-muted">
              {formatInTimezone(event.starts_at, event.timezone, locale)} – {formatInTimezone(event.ends_at, event.timezone, locale)} ({event.timezone})
              {", "}
              {t("org.eventCard.capacity").toLowerCase()} {event.capacity ?? t("org.eventCard.unlimited")}
            </p>
            {event.duplicated_from_event_id && (
              <p className="text-xs text-foreground-muted">
                {t("org.detail.duplicatedFrom")}{" "}
                <Link href={`/dashboard/events/${event.duplicated_from_event_id}`} className="text-brand hover:underline">
                  {t("org.detail.earlierEvent")}
                </Link>
                .
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                loading={duplicating}
                onClick={() => void handleDuplicate()}
                data-testid="duplicate-event"
              >
                {t("org.detail.duplicate")}
              </Button>
              {event.status !== "published" && (
                <Link
                  href={`/dashboard/events/${event.id}/preview`}
                  className="inline-flex items-center rounded-md border border-border-subtle px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
                  data-testid="preview-event"
                >
                  {t("orgSettings.preview")}
                </Link>
              )}
            </div>
          </div>
        </div>

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

      <SectionNav />

      <Section id="analytics">
        <EventAnalyticsPanel key={`analytics-${refreshKey}`} eventID={event.id} ticketTypes={ticketTypes} />
      </Section>

      <Section id="orders">
        <OrderManager eventID={event.id} onRefunded={() => setRefreshKey((n) => n + 1)} />
      </Section>

      {/*
        Keyed on the same counter as the analytics: a refund returns inventory,
        so leaving this panel showing the pre-refund "sold" would contradict
        the numbers directly above it.
      */}
      <Section id="tickets">
        <TicketTypeManager key={`types-${refreshKey}`} eventID={event.id} timezone={event.timezone} sections={sections} />
      </Section>

      <Section id="attendees">
        <AttendeeList key={`attendees-${refreshKey}`} eventID={event.id} />
      </Section>

      <Section id="staff">
        <StaffManager eventID={event.id} />
      </Section>

      <Section id="promo">
        <CampaignManager eventID={event.id} timezone={event.timezone} ticketTypes={ticketTypes} />
      </Section>

      <Section id="support">
        <SupportInbox eventID={event.id} />
      </Section>

      <Section id="history">
        <EventTimeline eventID={event.id} />
      </Section>
    </div>
  );
}

const SECTIONS: { id: string; label: MessageKey }[] = [
  { id: "analytics", label: "org.analytics.heading" },
  { id: "orders", label: "org.orders.heading" },
  { id: "tickets", label: "org.types.heading" },
  { id: "attendees", label: "org.attendees.heading" },
  { id: "staff", label: "org.staff.heading" },
  { id: "promo", label: "org.campaigns.heading" },
  { id: "support", label: "orderSupport.heading" },
  { id: "history", label: "org.timeline.heading" },
];

/** One part of the event page; a rule above, and an anchor for the section bar. */
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-40 border-t border-border-subtle pt-8">
      {children}
    </section>
  );
}

/**
 * The event page holds everything about one event, so a bar under the site
 * header jumps between its parts and shows which one is on screen (BF-100).
 */
function SectionNav() {
  const t = useT();
  const [current, setCurrent] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="scroll-row sticky top-[6.75rem] z-30 flex gap-6 overflow-x-auto border-b border-border-subtle bg-background"
      aria-label={t("org.detail.sections")}
    >
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={current === section.id ? "true" : undefined}
          className={`relative shrink-0 whitespace-nowrap py-3 text-sm ${
            current === section.id
              ? "font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          {t(section.label)}
        </a>
      ))}
    </nav>
  );
}
