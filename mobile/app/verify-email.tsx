import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { Banner, Button, CodeInput, Field, Muted, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";

/**
 * Email confirmation with the 6-digit code from the email (BF-100). A
 * signed-in account usually confirms from the Account tab; this screen also
 * works signed out, so it asks for the address too.
 */
export default function VerifyEmailScreen() {
  const t = useT();
  const { user, refresh } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : (user?.email ?? ""));
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setState("working");
    setError(null);
    try {
      await api.verifyEmail(email.trim(), code);
      setState("done");
      if (user) await refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? t("auth.verify.invalid") : t("auth.common.genericError"));
      setState("idle");
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      {state === "done" ? (
        <>
          <Title>{t("auth.verify.doneHeading")}</Title>
          <Banner tone="success">{t("auth.verify.doneBody")}</Banner>
          <Button title={t("auth.verify.continue")} onPress={() => router.replace(user ? "/explore" : "/login")} />
        </>
      ) : (
        <>
          <Title>{t("auth.verify.heading")}</Title>
          <Muted>{t("auth.verify.subtitle")}</Muted>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Field label={t("auth.common.email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Muted>{t("auth.verify.code")}</Muted>
          <CodeInput value={code} onChange={setCode} label={t("auth.verify.code")} invalid={Boolean(error)} testID="verify-code" />
          <Muted>{t("auth.verify.codeHint")}</Muted>
          <Button title={t("auth.verify.submit")} loading={state === "working"} disabled={code.length !== 6} onPress={() => void verify()} />
        </>
      )}
    </Screen>
  );
}
