import { Stack, router, useLocalSearchParams } from "expo-router";

import { ResetPasswordForm } from "../components/reset-password-form";
import { Button, Muted, Screen, Title } from "../components/ui";
import { useT } from "../lib/i18n/context";

/** Setting a new password does not sign anybody in; the login screen follows. */
export default function ResetPasswordScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ email?: string }>();
  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <Title>{t("auth.reset.heading")}</Title>
      <Muted>{t("auth.reset.subtitle")}</Muted>
      <ResetPasswordForm initialEmail={typeof params.email === "string" ? params.email : ""} />
      <Button variant="ghost" title={t("auth.reset.needCode") + " " + t("auth.reset.askOne")} onPress={() => router.replace("/forgot-password")} />
    </Screen>
  );
}
