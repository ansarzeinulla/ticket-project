import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { Badge, Banner, Body, Button, Card, Field, Heading, Loading, Muted, Row, Screen, Title } from "../components/ui";
import { ConfirmEmailCard } from "../components/confirm-email-card";
import { useAuth } from "../lib/auth-context";
import { ApiError, api } from "../lib/client";
import { useT } from "../lib/i18n/context";
import { payoutStatusLabel } from "../lib/labels";
import type { OrganizerProfile, ProfilePatch } from "../lib/models";

type Values = {
  display_name: string;
  legal_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  website_url: string;
};

/** The organizer's public profile, payout accounts and password (SRS 4.1, 4.5). */
export default function ProfileScreen() {
  const t = useT();
  const { user } = useAuth();
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [values, setValues] = useState<Values | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getProfile();
      setProfile(data.profile);
      setValues({
        display_name: data.profile.display_name ?? "",
        legal_name: data.profile.legal_name ?? "",
        contact_email: data.profile.contact_email ?? "",
        contact_phone: data.profile.contact_phone ?? "",
        description: data.profile.description ?? "",
        website_url: data.profile.website_url ?? "",
      });
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : t("org.profile.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!values) {
    return (
      <Screen>
        <ConfirmEmailCard />
        {loadError ? <Banner tone="error">{loadError}</Banner> : <Loading label={t("org.profile.loading")} />}
      </Screen>
    );
  }

  const update = (key: keyof Values, value: string) => {
    setValues((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  };

  async function save() {
    if (!values) return;
    setFormError(null);
    setFieldErrors({});
    setSaving(true);
    // An emptied field is sent as null, which is how the API clears it.
    const patch: ProfilePatch = {};
    for (const key of Object.keys(values) as (keyof Values)[]) {
      const trimmed = values[key].trim();
      patch[key] = trimmed === "" ? null : trimmed;
    }
    try {
      const data = await api.updateProfile(patch);
      setProfile(data.profile);
      setSaved(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setFormError(Object.keys(cause.fields).length > 0 ? t("auth.common.fixFields") : cause.message);
      } else {
        setFormError(t("auth.common.genericError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("org.titles.profile") }} />
      <Title>{t("org.titles.profile")}</Title>
      <Muted>{t("org.profile.signedInAs", { email: user?.email ?? "" })}</Muted>
      <ConfirmEmailCard />
      {saved ? <Banner tone="success">{t("org.profile.saved")}</Banner> : null}
      {formError ? <Banner tone="error">{formError}</Banner> : null}

      <Card>
        <Heading>{t("org.profile.details")}</Heading>
        <Field label={t("org.profile.displayName")} value={values.display_name} onChangeText={(v) => update("display_name", v)} hint={t("org.profile.displayNameHint")} error={fieldErrors.display_name} testID="profile-display-name" />
        <Field label={t("org.profile.legalName")} value={values.legal_name} onChangeText={(v) => update("legal_name", v)} error={fieldErrors.legal_name} />
        <Field label={t("org.profile.website")} value={values.website_url} onChangeText={(v) => update("website_url", v)} placeholder="https://" error={fieldErrors.website_url} keyboardType="url" autoCapitalize="none" />
        <Field label={t("org.profile.contactEmail")} value={values.contact_email} onChangeText={(v) => update("contact_email", v)} hint={t("org.profile.contactEmailHint")} error={fieldErrors.contact_email} keyboardType="email-address" autoCapitalize="none" />
        <Field label={t("org.profile.contactPhone")} value={values.contact_phone} onChangeText={(v) => update("contact_phone", v)} error={fieldErrors.contact_phone} keyboardType="phone-pad" />
        <Field label={t("org.profile.about")} value={values.description} onChangeText={(v) => update("description", v)} placeholder={t("org.profile.aboutPlaceholder")} error={fieldErrors.description} multiline />
        <Button title={saving ? t("org.form.saving") : t("org.profile.save")} loading={saving} onPress={() => void save()} testID="profile-save" />
      </Card>

      <Card>
        <Heading>{t("org.profile.payout")}</Heading>
        {(profile?.payout_accounts ?? []).length === 0 ? (
          <Muted>{t("org.profile.payoutNone")}</Muted>
        ) : (
          (profile?.payout_accounts ?? []).map((account) => (
            <Row key={account.id}>
              <Body>{account.masked_account ?? "••••"}</Body>
              <Muted>
                {account.provider} · {account.currency}
                {account.is_simulated ? ` · ${t("org.activation.simulated")}` : ""}
              </Muted>
              <Badge tone={account.status === "verified" ? "success" : "muted"} text={payoutStatusLabel(t, account.status)} />
            </Row>
          ))
        )}
        <Muted>{t("org.profile.payoutNote")}</Muted>
      </Card>

      <PasswordSection />
    </Screen>
  );
}

function PasswordSection() {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit() {
    setError(null);
    setFieldErrors({});
    setDone(false);
    if (next !== confirm) {
      setFieldErrors({ confirm: t("auth.common.mismatch") });
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(Object.keys(cause.fields).length > 0 ? null : cause.message);
      } else {
        setError(t("org.profile.passwordFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Heading>{t("auth.common.password")}</Heading>
      <Muted>{t("org.profile.passwordNote")}</Muted>
      {done ? <Banner tone="success">{t("org.profile.passwordChanged")}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label={t("org.profile.currentPassword")} value={current} onChangeText={setCurrent} error={fieldErrors.current_password} secure autoCapitalize="none" />
      <Field label={t("auth.reset.newPassword")} value={next} onChangeText={setNext} hint={t("auth.common.minLengthHint")} error={fieldErrors.new_password} secure autoCapitalize="none" />
      <Field label={t("auth.reset.confirm")} value={confirm} onChangeText={setConfirm} error={fieldErrors.confirm} secure autoCapitalize="none" />
      <Button title={t("auth.reset.submit")} loading={busy} disabled={!current || !next} onPress={() => void submit()} />
    </Card>
  );
}
