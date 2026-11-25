import { Stack, router } from "expo-router";
import { useState } from "react";

import { StyleSheet, View } from "react-native";

import { Banner, Button, Field, Muted, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/client";
import { theme } from "../lib/theme";
import { useT } from "../lib/i18n/context";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterScreen() {
  const t = useT();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (password !== confirm) {
      setFieldErrors({ confirm: t("auth.common.mismatch") });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({ password: t("auth.register.tooShort", { min: MIN_PASSWORD_LENGTH }) });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register({ email: email.trim(), password, full_name: fullName.trim() || undefined });
      router.replace("/explore");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(
          cause.code === "conflict"
            ? t("auth.register.exists")
            : Object.keys(cause.fields).length > 0
              ? t("auth.common.fixFields")
              : cause.message,
        );
      } else {
        setError(t("auth.common.genericError"));
      }
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "" }} />
      <Title>{t("auth.register.heading")}</Title>
      <Muted>{t("auth.register.subtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label={t("auth.register.fullName")} value={fullName} onChangeText={setFullName} hint={t("auth.register.fullNameHint")} error={fieldErrors.full_name} autoCapitalize="words" />
      <Field label={t("auth.common.email")} value={email} onChangeText={setEmail} error={fieldErrors.email} keyboardType="email-address" autoCapitalize="none" />
      <Field label={t("auth.common.password")} value={password} onChangeText={setPassword} placeholder={t("auth.common.minLength")} error={fieldErrors.password} secure autoCapitalize="none" />
      <Field label={t("auth.register.confirm")} value={confirm} onChangeText={setConfirm} error={fieldErrors.confirm} secure autoCapitalize="none" />
      <Button
        title={submitting ? t("auth.register.submitting") : t("auth.register.submit")}
        loading={submitting}
        onPress={() => void submit()}
        testID="register-submit"
      />
      <View style={styles.divider} />
      <Muted style={styles.center}>{t("auth.register.already")}</Muted>
      <Button variant="outline" title={t("auth.common.signIn")} onPress={() => router.replace("/login")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginVertical: 8 },
  center: { textAlign: "center" },
});
