"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatInTimezone } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/context";
import type { PlatformSetting } from "@/lib/types";

/** Text a person can edit: strings as they are, anything else as JSON. */
function asText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** The reverse of asText, keeping the setting's original JSON type. */
function fromText(text: string, original: unknown): unknown {
  if (typeof original === "string") return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** SRS 4.12: "Configure activation fees and platform settings." */
export function AdminSettings() {
  const { t, locale } = useI18n();
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
    const controller = new AbortController();
    api
      .listSettings(controller.signal)
      .then((data) => {
        setSettings(data.settings);
        setDrafts(Object.fromEntries(data.settings.map((item) => [item.key, asText(item.value)])));
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("adminTools.settingsLoadFailed"));
      });
    return () => controller.abort();
  }, [isAdmin, t]);

  async function save(setting: PlatformSetting) {
    setSaving(setting.key);
    setSavedKey(null);
    setRowError((current) => ({ ...current, [setting.key]: "" }));
    try {
      const result = await api.updateSetting(
        setting.key,
        fromText(drafts[setting.key] ?? "", setting.value),
      );
      setSettings((current) =>
        current?.map((item) => (item.key === setting.key ? result.setting : item)) ?? null,
      );
      setSavedKey(setting.key);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? (Object.values(cause.fields)[0] ?? cause.message)
          : t("adminTools.saveFailed");
      setRowError((current) => ({ ...current, [setting.key]: message }));
    } finally {
      setSaving(null);
    }
  }

  if (!isAdmin) {
    return (
      <Alert tone="error" title={t("org.reports.deniedTitle")}>
        {t("org.reports.deniedBody")}
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-foreground-muted hover:underline">
          {t("adminTools.back")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{t("adminTools.settingsTitle")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{t("adminTools.settingsSubtitle")}</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {settings === null ? (
        !error && (
          <p className="flex items-center gap-2 text-sm text-foreground-muted">
            <Spinner aria-hidden /> {t("org.common.loading")}
          </p>
        )
      ) : (
        <ul className="space-y-3" data-testid="settings-list">
          {settings.map((setting) => (
            <li key={setting.key} className="space-y-2 rounded-xl border border-border-subtle bg-surface p-5">
              <div>
                <p className="font-mono text-sm font-medium">{setting.key}</p>
                {setting.description && (
                  <p className="text-xs text-foreground-muted">{setting.description}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={setting.key}
                  value={drafts[setting.key] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))
                  }
                  className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface px-3 py-2 font-mono text-sm"
                />
                <Button
                  size="sm"
                  loading={saving === setting.key}
                  disabled={(drafts[setting.key] ?? "") === asText(setting.value)}
                  onClick={() => void save(setting)}
                >
                  {t("adminTools.save")}
                </Button>
              </div>
              {rowError[setting.key] && <p className="text-xs text-danger">{rowError[setting.key]}</p>}
              {savedKey === setting.key && <p className="text-xs text-success">{t("adminTools.saved")}</p>}
              <p className="text-xs text-foreground-muted">
                {t("adminTools.updated", { when: formatInTimezone(setting.updated_at, "Asia/Almaty", locale) })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
