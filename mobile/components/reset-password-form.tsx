import { router } from "expo-router";
import { useState } from "react";

import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import { View } from "react-native";

import { Banner, Button, CodeInput, Field, Muted, Title } from "./ui";

/**
 * The address, the emailed 6-digit code and the new password (BF-100). The
 * forgot-password screen shows it right after sending the code, with the
 * address filled in; the reset-password screen shows it on its own.
 */
export function ResetPasswordForm({ initialEmail = "", embedded = false }: { initialEmail?: string; embedded?: boolean }) {
  const t = useT();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
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
      await api.resetPassword(email.trim(), code, password);
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

  if (done) {
    return (
      <>
        <Title>{t("auth.reset.doneHeading")}</Title>
        <Banner tone="success">{t("auth.reset.doneBody")}</Banner>
        <Button title={t("auth.reset.goSignIn")} onPress={() => router.replace("/login")} />
      </>
    );
  }

  return (
    <>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {!embedded ? (
        <Field label={t("auth.common.email")} value={email} onChangeText={setEmail} error={fieldErrors.email} keyboardType="email-address" autoCapitalize="none" />
      ) : null}
      <View style={{ gap: 6 }}>
        <Muted>{t("auth.reset.code")}</Muted>
        <CodeInput value={code} onChange={setCode} label={t("auth.reset.code")} invalid={Boolean(fieldErrors.code)} testID="reset-code" />
        <Muted>{fieldErrors.code ?? t("auth.reset.codeHint")}</Muted>
      </View>
      <Field label={t("auth.reset.newPassword")} value={password} onChangeText={setPassword} hint={t("auth.common.minLengthHint")} error={fieldErrors.password} secure autoCapitalize="none" />
      <Field label={t("auth.reset.confirm")} value={confirmation} onChangeText={setConfirmation} error={fieldErrors.confirmation} secure autoCapitalize="none" />
      <Button title={t("auth.reset.submit")} loading={submitting} disabled={code.length !== 6} onPress={() => void submit()} />
    </>
  );
}
