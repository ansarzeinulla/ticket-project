import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { Banner, Button, Field, Muted, Screen, Title } from "../components/ui";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";

/** A code from the link is redeemed on arrival; otherwise it can be pasted. */
export default function VerifyEmailScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ token?: string }>();
  const linkToken = typeof params.token === "string" ? params.token : "";
  const [token, setToken] = useState(linkToken);
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">(linkToken ? "working" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function verify(code: string) {
    setState("working");
    setError(null);
    try {
      await api.verifyEmail(code.trim());
      setState("done");
    } catch (cause) {
      setError(cause instanceof ApiError ? t("auth.verify.invalid") : t("auth.common.genericError"));
      setState("failed");
    }
  }

  useEffect(() => {
    if (linkToken) void verify(linkToken);
    // Only the token the screen was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken]);

  return (
    <Screen>
      <Stack.Screen options={{ title: t("auth.verify.title") }} />
      {state === "done" ? (
        <>
          <Title>{t("auth.verify.doneHeading")}</Title>
          <Banner tone="success">{t("auth.verify.doneBody")}</Banner>
          <Button title={t("auth.verify.continue")} onPress={() => router.replace("/explore")} />
        </>
      ) : (
        <>
          <Title>{t("auth.verify.heading")}</Title>
          <Muted>{state === "working" ? t("auth.verify.checking") : t("auth.verify.subtitle")}</Muted>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Field label={t("auth.verify.code")} value={token} onChangeText={setToken} hint={t("auth.verify.codeHint")} autoCapitalize="none" />
          <Button title={t("auth.verify.submit")} loading={state === "working"} disabled={!token.trim()} onPress={() => void verify(token)} />
        </>
      )}
    </Screen>
  );
}
