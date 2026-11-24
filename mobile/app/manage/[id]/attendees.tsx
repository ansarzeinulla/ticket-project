import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { Badge, Banner, Body, Button, Card, Empty, Field, Loading, Muted, Row, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { useT } from "../../../lib/i18n/context";
import { attendeeStatusLabel } from "../../../lib/labels";
import type { AttendeeTicket } from "../../../lib/models";

/** Search the attendee list and check somebody in by hand (SRS 4.8). */
export default function AttendeesScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [query, setQuery] = useState("");
  const [attendees, setAttendees] = useState<AttendeeTicket[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  async function search(term: string) {
    setSearching(true);
    try {
      setAttendees(await api.eventAttendees(id, term.trim()));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.attendees.searchFailed"));
    } finally {
      setSearching(false);
    }
  }

  // Searches as the organizer types, once there are two characters.
  useEffect(() => {
    if (query.trim().length < 2) {
      setAttendees(null);
      return;
    }
    const timer = setTimeout(() => void search(query), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function admit(attendee: AttendeeTicket) {
    setCheckingIn(attendee.ticket_id);
    setNote(null);
    try {
      await api.checkInManually(id, attendee.ticket_id, "organizer app");
      setNote(t("org.attendees.admitted", { name: attendee.attendee_name }));
      await search(query);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.attendees.admitFailed"));
    } finally {
      setCheckingIn(null);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.attendees.heading") }} />
      <Title>{t("org.attendees.heading")}</Title>
      <Muted>{t("org.attendees.subtitle")}</Muted>
      <Field label={t("org.attendees.searchLabel")} value={query} onChangeText={setQuery} placeholder={t("org.attendees.placeholder")} autoCapitalize="none" testID="attendee-search" />
      {note ? <Banner tone="success">{note}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {query.trim().length < 2 ? (
        <Muted>{t("org.attendees.minChars")}</Muted>
      ) : searching && attendees === null ? (
        <Loading label={t("org.attendees.searching")} />
      ) : attendees && attendees.length === 0 ? (
        <Empty>{t("org.attendees.none")}</Empty>
      ) : (
        (attendees ?? []).map((attendee) => (
          <Card key={attendee.ticket_id} testID={`attendee-${attendee.ticket_code}`}>
            <Row>
              <Body>{attendee.attendee_name}</Body>
              <Badge tone={attendee.status === "checked_in" ? "success" : attendee.admissible ? "info" : "error"} text={attendeeStatusLabel(t, attendee.status)} />
            </Row>
            <Muted>{attendee.attendee_email}</Muted>
            <Muted>
              {attendee.ticket_type_name} · {attendee.ticket_code} · {attendee.order_number}
            </Muted>
            <Button
              small
              title={attendee.status === "checked_in" ? t("org.attendees.alreadyIn") : t("org.attendees.checkIn")}
              disabled={!attendee.admissible || checkingIn !== null}
              loading={checkingIn === attendee.ticket_id}
              onPress={() => void admit(attendee)}
              testID={`admit-${attendee.ticket_code}`}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
