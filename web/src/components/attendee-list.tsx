"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { AttendeeTicket } from "@/lib/types";

/** How long to wait after a keystroke before searching. */
const DEBOUNCE_MS = 300;

const STATUS_LABELS: Record<AttendeeTicket["status"], MessageKey> = {
  valid: "org.attendees.statusValid",
  checked_in: "org.attendees.statusCheckedIn",
  cancelled: "org.attendees.statusCancelled",
  refunded: "org.attendees.statusRefunded",
};

const STATUS_TONES: Record<AttendeeTicket["status"], string> = {
  valid: "bg-surface-muted text-foreground-muted",
  checked_in: "bg-success-soft text-success",
  cancelled: "bg-danger-soft text-danger",
  refunded: "bg-danger-soft text-danger",
};

/**
 * The organizer's attendee list (SRS 4.4: "The organizer shall see the
 * registration in the attendee list"; SRS 4.8: "Search for attendees
 * manually").
 *
 * The orders table next to this one answers "who bought what" - this answers
 * "is this person on the list", which is a different question and the one
 * asked at a door. The endpoint has existed since Phase 12 and the scanner app
 * used it; the web dashboard never did.
 *
 * A sequence number guards the results: a slow response for "an" must not
 * overwrite a fast one for "anna" typed after it.
 */
export function AttendeeList({ eventID }: { eventID: string }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [attendees, setAttendees] = useState<AttendeeTicket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const sequence = useRef(0);

  const search = useCallback(
    async (term: string, signal?: AbortSignal) => {
      // The API requires at least two characters; asking for fewer is a 422,
      // not a search, so the field simply waits.
      if (term.trim().length < 2) {
        setAttendees(null);
        setError(null);
        setLoading(false);
        return;
      }

      const mine = ++sequence.current;
      setLoading(true);
      try {
        const found = await api.eventAttendees(eventID, term.trim(), signal);
        if (mine !== sequence.current) return;
        setAttendees(found);
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (mine !== sequence.current) return;
        setError(cause instanceof ApiError ? cause.message : t("org.attendees.searchFailed"));
      } finally {
        if (mine === sequence.current) setLoading(false);
      }
    },
    [eventID, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void search(query, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, search]);

  async function admit(attendee: AttendeeTicket) {
    setCheckingIn(attendee.ticket_id);
    setError(null);
    setNote(null);
    try {
      await api.checkInManually(eventID, attendee.ticket_id, "organizer dashboard");
      setNote(t("org.attendees.admitted", { name: attendee.attendee_name }));
      await search(query);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : t("org.attendees.admitFailed"),
      );
    } finally {
      setCheckingIn(null);
    }
  }

  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{t("org.attendees.heading")}</h2>
        <p className="text-xs text-foreground-muted">
          {t("org.attendees.subtitle")}
        </p>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">{t("org.attendees.searchLabel")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("org.attendees.placeholder")}
          className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm"
          data-testid="attendee-search"
        />
      </label>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
      {note && (
        <div className="mt-3">
          <Alert tone="success">{note}</Alert>
        </div>
      )}

      <div className="mt-3" aria-live="polite">
        {loading && (
          <p className="flex items-center gap-2 text-sm text-foreground-muted">
            <Spinner aria-hidden /> {t("org.attendees.searching")}
          </p>
        )}

        {!loading && query.trim().length < 2 && (
          <p className="text-sm text-foreground-muted">
            {t("org.attendees.minChars")}
          </p>
        )}

        {!loading && attendees?.length === 0 && (
          <p className="text-sm text-foreground-muted" data-testid="attendee-empty">
            {t("org.attendees.none")}
          </p>
        )}

        {!loading && attendees && attendees.length > 0 && (
          <ul className="divide-y divide-border-subtle" data-testid="attendee-results">
            {attendees.map((attendee) => (
              <li
                key={attendee.ticket_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
                data-testid={`attendee-${attendee.ticket_id}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{attendee.attendee_name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONES[attendee.status]}`}
                    >
                      {t(STATUS_LABELS[attendee.status])}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted">{attendee.attendee_email}</p>
                  <p className="font-mono text-xs text-foreground-muted">
                    {attendee.ticket_type_name} · {attendee.ticket_code} ·{" "}
                    {attendee.order_number}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!attendee.admissible || checkingIn !== null}
                  loading={checkingIn === attendee.ticket_id}
                  onClick={() => admit(attendee)}
                  data-testid={`admit-${attendee.ticket_id}`}
                >
                  {attendee.status === "checked_in" ? t("org.attendees.alreadyIn") : t("org.attendees.checkIn")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
