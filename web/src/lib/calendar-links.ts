import { PUBLIC_API_BASE_URL } from "@/lib/api";

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

function details(event: CalendarEvent): string {
  return [event.description, event.url].filter(Boolean).join("\n\n");
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
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compact(event.starts_at)}/${compact(event.ends_at)}`,
    ctz: event.timezone,
    details: details(event),
    location: where(event),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook.com's compose link. */
export function outlookCalendarURL(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: new Date(event.starts_at).toISOString(),
    enddt: new Date(event.ends_at).toISOString(),
    body: details(event),
    location: where(event),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
