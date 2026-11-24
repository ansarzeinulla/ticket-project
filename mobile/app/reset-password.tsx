import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { Banner, Button, Field, Muted, Screen, Title } from "../components/ui";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";

/** Setting a new password does not sign anybody in; the login screen follows. */
export default function ResetPasswordScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(typeof params.token === "string" ? params.token : "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (password !== confirmation) {
      setFieldErrors({ confirmation: t("auth.common.mismatch") });
      return;
    }
    setFieldErrors({});
    setError(null);
    setSubmitting(true);
    try {
      await api.resetPassword(token.trim(), password);
      setDone(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(cause.code === "token_invalid" ? t("auth.reset.invalid") : Object.keys(cause.fields).length > 0 ? null : cause.message);
      } else {
        setError(t("auth.common.genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("auth.reset.title") }} />
      {done ? (
        <>
          <Title>{t("auth.reset.doneHeading")}</Title>
          <Banner tone="success">{t("auth.reset.doneBody")}</Banner>
          <Button title={t("auth.reset.goSignIn")} onPress={() => router.replace("/login")} />
        </>
      ) : (
        <>
          <Title>{t("auth.reset.heading")}</Title>
          <Muted>{t("auth.reset.subtitle")}</Muted>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Field label={t("auth.reset.code")} value={token} onChangeText={setToken} hint={t("auth.reset.codeHint")} error={fieldErrors.token} autoCapitalize="none" />
          <Field label={t("auth.reset.newPassword")} value={password} onChangeText={setPassword} hint={t("auth.common.minLengthHint")} error={fieldErrors.password} secure autoCapitalize="none" />
          <Field label={t("auth.reset.confirm")} value={confirmation} onChangeText={setConfirmation} error={fieldErrors.confirmation} secure autoCapitalize="none" />
          <Button title={t("auth.reset.submit")} loading={submitting} onPress={() => void submit()} />
          <Button variant="ghost" title={t("auth.reset.needCode") + " " + t("auth.reset.askOne")} onPress={() => router.replace("/forgot-password")} />
        </>
      )}
    </Screen>
  );
}
