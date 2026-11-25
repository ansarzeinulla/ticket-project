import { Stack, useLocalSearchParams } from "expo-router";

import { SupportThreadView } from "../../components/support-thread";
import { Screen } from "../../components/ui";
import { useT } from "../../lib/i18n/context";

/** One support conversation - attendee, organizer or admin side. */
export default function SupportCaseScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <Stack.Screen options={{ title: t("orderSupport.heading") }} />
      <SupportThreadView caseID={id} />
    </Screen>
  );
}
