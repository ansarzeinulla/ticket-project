import { Stack, router, useLocalSearchParams } from "expo-router";

import { Body, Button, Screen, Title } from "../../components/ui";
import type { MessageKey } from "../../lib/i18n/dictionaries";
import { useI18n } from "../../lib/i18n/context";

export const LEGAL_PAGES = ["terms", "privacy", "refunds", "cookies", "about", "contacts"] as const;

/** The legal pages - all of them the same joke, as on the website (BF-100). */
export default function LegalScreen() {
  const { t } = useI18n();
  const { page } = useLocalSearchParams<{ page: string }>();
  const known = (LEGAL_PAGES as readonly string[]).includes(page ?? "");
  const title = known ? t(`legal.${page}` as MessageKey) : "BiletFlow";

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Title>{t("legal.gotYou")}</Title>
      <Body>{t("legal.body")}</Body>
      <Button title={t("legal.back")} onPress={() => router.replace("/explore")} testID="legal-back" />
    </Screen>
  );
}
