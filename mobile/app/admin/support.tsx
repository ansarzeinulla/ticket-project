import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { CaseList } from "../../components/case-list";
import { Banner, Button, Empty, Loading, Muted, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import type { SupportCase } from "../../lib/models";

/** Organizers' requests to BiletFlow, for platform staff (SRS 4.13). */
export default function PlatformInboxScreen() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const [cases, setCases] = useState<SupportCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCases(await api.platformSupportCases());
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("platformInbox.loadFailed"));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) void load();
    }, [isAdmin, load]),
  );

  if (!isAdmin) {
    return (
      <Screen>
        <Banner tone="error" title={t("org.reports.deniedTitle")}>{t("org.reports.deniedBody")}</Banner>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("platformInbox.title") }} />
      <Title>{t("platformInbox.title")}</Title>
      <Muted>{t("platformInbox.subtitle")}</Muted>
      <Button small variant="secondary" title={t("org.common.refresh")} onPress={() => void load()} />
      {error ? <Banner tone="error">{error}</Banner> : null}
      {cases === null ? <Loading label={t("org.common.loading")} /> : cases.length === 0 ? <Empty>{t("platformInbox.none")}</Empty> : <CaseList cases={cases} showRequester />}
    </Screen>
  );
}
