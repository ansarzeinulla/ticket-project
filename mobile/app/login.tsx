import { Stack, router } from "expo-router";
import { useState } from "react";

import { Banner, Button, Field, Muted, Row, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/client";
import { API_HOST_LABEL } from "../lib/config";
import { useT } from "../lib/i18n/context";

/** Sign in - attendees, organizers, gate staff and admins all use one account. */
export default function LoginScreen() {
  const t = useT();
  const { signIn, lastEmail } = useAuth();
  const [email, setEmail] = useState(lastEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      if (router.canGoBack()) router.back();
      else router.replace("/explore");
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === "invalid_credentials"
          ? t("auth.login.invalid")
          : cause instanceof ApiError
            ? cause.message
            : t("auth.common.genericError"),
      );
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("auth.login.title") }} />
      <Title>{t("auth.login.heading")}</Title>
      <Muted>{t("auth.login.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label={t("auth.common.email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="dana@biletflow.kz" testID="login-email" />
      <Field label={t("auth.common.password")} value={password} onChangeText={setPassword} secure autoCapitalize="none" testID="login-password" />
      <Button
        title={submitting ? t("auth.login.submitting") : t("auth.login.submit")}
        loading={submitting}
        disabled={!email.trim() || !password}
        onPress={() => void submit()}
        testID="login-submit"
      />
      <Button variant="ghost" title={t("auth.login.forgot")} onPress={() => router.push("/forgot-password")} />
      <Row>
        <Muted>{t("auth.login.noAccount")}</Muted>
        <Button small variant="secondary" title={t("auth.login.createOne")} onPress={() => router.replace("/register")} />
      </Row>
      <Muted>API: {API_HOST_LABEL}</Muted>
    </Screen>
  );
}
