import { useState } from "react";
import { View } from "react-native";

import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import { Banner, Button, Card, CodeInput, Heading, Muted, Row } from "./ui";

/**
 * Confirming the account's address with the emailed 6-digit code (SRS 4.1,
 * BF-100), at the top of the Profile screen. A full code confirms by itself.
 */
export function ConfirmEmailCard() {
  const t = useT();
  const { user, refresh } = useAuth();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "sending" | "sent" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  if (state === "done") return <Banner tone="success">{t("home.verifyDone")}</Banner>;
  if (user.email_verified_at) return null;

  async function confirm(next: string) {
    if (!user || next.length !== 6) return;
    setState("checking");
    setError(null);
    try {
      await api.verifyEmail(user.email, next);
      setState("done");
      await refresh();
    } catch (cause) {
      setState("idle");
      setCode("");
      setError(cause instanceof ApiError && cause.code !== "token_invalid" && !cause.fields.code
        ? cause.message
        : t("auth.verify.invalid"));
    }
  }

  async function resend() {
    setState("sending");
    setError(null);
    try {
      await api.requestEmailVerification();
      setState("sent");
    } catch (cause) {
      setState("idle");
      setError(cause instanceof ApiError ? cause.message : t("auth.common.genericError"));
    }
  }

  return (
    <Card>
      <Heading>{t("home.verifySection")}</Heading>
      <Muted>{t("home.verifySectionBody", { email: user.email })}</Muted>
      <View>
        <CodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            setError(null);
            if (next.length === 6) void confirm(next);
          }}
          label={t("home.verifyCode")}
          invalid={Boolean(error)}
          disabled={state === "checking"}
          testID="verify-email-code"
        />
      </View>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Row>
        <Button
          title={t("home.verifyConfirm")}
          loading={state === "checking"}
          disabled={code.length !== 6}
          onPress={() => void confirm(code)}
          testID="verify-email-confirm"
        />
        {state === "sent" ? (
          <Muted>{t("home.verifySent")}</Muted>
        ) : (
          <Button
            variant="secondary"
            title={t("home.verifyResend")}
            loading={state === "sending"}
            onPress={() => void resend()}
            testID="verify-email-resend"
          />
        )}
      </Row>
    </Card>
  );
}
