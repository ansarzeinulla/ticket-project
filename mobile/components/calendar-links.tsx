import { Linking } from "react-native";

import { googleCalendarURL, icsURL, outlookCalendarURL, type CalendarEvent } from "../lib/calendar-links";
import { useT } from "../lib/i18n/context";
import { Button, Muted, Row } from "./ui";

/** SRS 4.11: one-tap calendar options; nothing asks for calendar access. */
export function CalendarLinks({ event }: { event: CalendarEvent }) {
  const t = useT();
  return (
    <Row>
      <Muted>{t("calendar.add")}</Muted>
      <Button small variant="secondary" title={t("calendar.ics")} onPress={() => void Linking.openURL(icsURL(event.id))} />
      <Button small variant="secondary" title="Google" onPress={() => void Linking.openURL(googleCalendarURL(event))} />
      <Button small variant="secondary" title="Outlook" onPress={() => void Linking.openURL(outlookCalendarURL(event))} />
    </Row>
  );
}
