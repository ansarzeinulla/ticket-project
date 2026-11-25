import { API_BASE_URL as PUBLIC_API_BASE_URL } from "./config";

/** What a calendar entry needs (SRS 4.11). */
export interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  description?: string;
  venue_name?: string;
  venue_address?: string;
  url?: string;
}

/** 2026-12-30T16:00:00Z -> 20261230T160000Z, the form calendar links use. */
function compact(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function where(event: CalendarEvent): string {
  return [event.venue_name, event.venue_address].filter(Boolean).join(", ");
}

/**
 * Calendar links carry everything in the URL, and Google refuses URLs much
 * over 8 000 characters with "400 Bad Request". A Cyrillic letter becomes six
 * characters once encoded, so a long description alone can break the link.
 * The links carry a short excerpt plus the event URL; the .ics file and the
 * event page keep the full text.
 */
const LINK_DESCRIPTION_CHARS = 300;
const MAX_LINK_LENGTH = 7000;

function details(event: CalendarEvent, limit = LINK_DESCRIPTION_CHARS): string {
  const text = event.description?.trim() ?? "";
  const excerpt = text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
  return [excerpt, event.url].filter(Boolean).join("\n\n");
}

/** Builds a link, shortening the description until the URL fits. */
function fitted(build: (description: string) => string, event: CalendarEvent): string {
  for (const limit of [LINK_DESCRIPTION_CHARS, 120, 0]) {
    const url = build(details(event, limit));
    if (url.length <= MAX_LINK_LENGTH) return url;
  }
  return build(event.url ?? "");
}

/**
 * The .ics file the API serves. It carries a stable UID, so downloading it
 * again after a change replaces the old entry, and a cancelled event exports
 * STATUS:CANCELLED (SRS 4.11).
 */
export function icsURL(eventID: string): string {
  return `${PUBLIC_API_BASE_URL}/events/${eventID}/calendar.ics`;
}

/** Google Calendar's "add event" link. Nothing is written to anyone's calendar. */
export function googleCalendarURL(event: CalendarEvent): string {
  return fitted((description) => {
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates: `${compact(event.starts_at)}/${compact(event.ends_at)}`,
      ctz: event.timezone,
      details: description,
      location: where(event),
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, event);
}

/** Outlook.com's compose link. */
export function outlookCalendarURL(event: CalendarEvent): string {
  return fitted((description) => {
    const params = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: event.title,
      startdt: new Date(event.starts_at).toISOString(),
      enddt: new Date(event.ends_at).toISOString(),
      body: description,
      location: where(event),
    });
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }, event);
}
