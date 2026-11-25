import { Stack, router } from "expo-router";
import { useState } from "react";

import { ResetPasswordForm } from "../components/reset-password-form";
import { Banner, Button, Field, Muted, Screen, Title } from "../components/ui";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";

/** The answer never says whether the address has an account (SRS 4.1). */
export default function ForgotPasswordScreen() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.requestPasswordReset(email.trim());
      setSent(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("auth.common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      {sent ? (
        <>
          <Title>{t("auth.forgot.sentHeading")}</Title>
          <Banner tone="success" title={t("auth.forgot.sentTitle")}>
            {t("auth.forgot.sentBodyBefore") + email.trim() + t("auth.forgot.sentBodyAfter")}
          </Banner>
          {/* The code is typed right here, without leaving the screen (BF-100). */}
          <ResetPasswordForm initialEmail={email.trim()} embedded />
          <Button variant="ghost" title={t("auth.forgot.back")} onPress={() => router.replace("/login")} />
        </>
      ) : (
        <>
          <Title>{t("auth.forgot.heading")}</Title>
          <Muted>{t("auth.forgot.subtitle")}</Muted>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Field label={t("auth.common.email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Button title={t("auth.forgot.submit")} loading={submitting} disabled={!email.trim()} onPress={() => void submit()} />
          <Button variant="ghost" title={t("auth.forgot.remembered") + " " + t("auth.common.signIn")} onPress={() => router.replace("/login")} />
        </>
      )}
    </Screen>
  );
}
