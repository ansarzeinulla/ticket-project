import { googleCalendarURL, icsURL, outlookCalendarURL, type CalendarEvent } from "@/lib/calendar-links";
import type { Translator } from "@/lib/i18n/translate";

/**
 * One-click calendar options (SRS 4.11). Plain links, so the platform never
 * asks for access to anybody's calendar account; usable from server and
 * client components alike because the translator is passed in.
 */
export function AddToCalendar({ event, t }: { event: CalendarEvent; t: Translator }) {
  const link =
    "inline-flex items-center rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium hover:bg-surface-muted";
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="add-to-calendar">
      <span className="text-xs text-foreground-muted">{t("calendar.add")}</span>
      <a href={icsURL(event.id)} className={link} download>
        {t("calendar.ics")}
      </a>
      <a href={googleCalendarURL(event)} className={link} target="_blank" rel="noopener noreferrer">
        Google
      </a>
      <a href={outlookCalendarURL(event)} className={link} target="_blank" rel="noopener noreferrer">
        Outlook
      </a>
    </div>
  );
}
