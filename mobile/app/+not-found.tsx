import { Stack, router } from "expo-router";

import { Body, Button, Screen, Title } from "../components/ui";
import { useT } from "../lib/i18n/context";

/** A link that leads nowhere in the app: a plain way back, no error codes (BF-100). */
export default function NotFoundScreen() {
  const t = useT();
  return (
    <Screen>
      <Stack.Screen options={{ title: "BiletFlow" }} />
      <Title>{t("notFound.heading")}</Title>
      <Body>{t("notFound.body")}</Body>
      <Button title={t("notFound.back")} onPress={() => router.replace("/explore")} testID="not-found-back" />
    </Screen>
  );
}
