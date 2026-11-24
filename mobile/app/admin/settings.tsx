import { Stack } from "expo-router";
import { useEffect, useState } from "react";

import { Banner, Body, Button, Card, Field, Loading, Muted, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import type { PlatformSetting } from "../../lib/models";

function asText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function fromText(text: string, original: unknown): unknown {
  if (typeof original === "string") return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Activation fee and platform settings (SRS 4.12). */
export default function AdminSettingsScreen() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const [settings, setSettings] = useState<PlatformSetting[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .listSettings()
      .then((data) => {
        setSettings(data.settings);
        setDrafts(Object.fromEntries(data.settings.map((item) => [item.key, asText(item.value)])));
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : t("adminTools.settingsLoadFailed")));
  }, [isAdmin, t]);

  async function save(setting: PlatformSetting) {
    setSaving(setting.key);
    setSavedKey(null);
    setRowError((current) => ({ ...current, [setting.key]: "" }));
    try {
      const result = await api.updateSetting(setting.key, fromText(drafts[setting.key] ?? "", setting.value));
      setSettings((current) => current?.map((item) => (item.key === setting.key ? result.setting : item)) ?? null);
      setSavedKey(setting.key);
    } catch (cause) {
      setRowError((current) => ({ ...current, [setting.key]: cause instanceof ApiError ? cause.message : t("adminTools.saveFailed") }));
    } finally {
      setSaving(null);
    }
  }

  if (!isAdmin) {
    return (
      <Screen>
        <Banner tone="error" title={t("org.reports.deniedTitle")}>{t("org.reports.deniedBody")}</Banner>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("adminTools.settingsTitle") }} />
      <Title>{t("adminTools.settingsTitle")}</Title>
      <Muted>{t("adminTools.settingsSubtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {settings === null ? (
        error ? null : <Loading label={t("org.common.loading")} />
      ) : (
        settings.map((setting) => (
          <Card key={setting.key} testID={`setting-${setting.key}`}>
            <Body>{setting.key}</Body>
            {setting.description ? <Muted>{setting.description}</Muted> : null}
            <Field label={setting.key} value={drafts[setting.key] ?? ""} onChangeText={(value) => setDrafts((current) => ({ ...current, [setting.key]: value }))} error={rowError[setting.key] || undefined} autoCapitalize="none" />
            <Button small title={t("adminTools.save")} loading={saving === setting.key} onPress={() => void save(setting)} />
            {savedKey === setting.key ? <Banner tone="success">{t("adminTools.saved")}</Banner> : null}
            <Muted>{t("adminTools.updated", { when: new Date(setting.updated_at).toLocaleString() })}</Muted>
          </Card>
        ))
      )}
    </Screen>
  );
}
