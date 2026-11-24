import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";

import { Badge, Banner, Body, Button, Card, Empty, Loading, Muted, Screen, Title } from "../../../components/ui";
import { ApiError, api } from "../../../lib/client";
import { useT } from "../../../lib/i18n/context";
import type { SupportCase } from "../../../lib/models";
import { supportCategoryLabel, supportStatusLabel } from "../../../lib/support-labels";

/** Questions attendees asked about this event (SRS 4.13). */
export default function EventSupportScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cases, setCases] = useState<SupportCase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCases(await api.eventSupportCases(id));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.inbox.loadFailed"));
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openCount = (cases ?? []).filter((item) => item.status === "open").length;

  return (
    <Screen>
      <Stack.Screen options={{ title: t("orderSupport.heading") }} />
      <Title>{t("orderSupport.heading")}</Title>
      {cases ? (
        <Muted>
          {cases.length === 0
            ? t("org.inbox.noneYet")
            : `${cases.length === 1 ? t("org.inbox.caseOne") : t("org.inbox.caseMany", { count: cases.length })} · ${t("org.inbox.needReply", { count: openCount })}`}
        </Muted>
      ) : null}
      <Button small variant="secondary" title={t("org.common.refresh")} onPress={() => void load()} />
      {error ? <Banner tone="error">{error}</Banner> : null}
      {cases === null ? (
        <Loading label={t("org.inbox.loading")} />
      ) : cases.length === 0 ? (
        <Empty>{t("org.inbox.empty")}</Empty>
      ) : (
        cases.map((item) => (
          <Card key={item.id} onPress={() => router.push(`/support/${item.id}`)} testID="inbox-case">
            <Body>{item.subject}</Body>
            <Muted>
              {item.case_number} · {supportCategoryLabel(t, item.category)} · {t("supportThread.from", { name: item.requester_name })}
              {item.order_number ? ` · ${t("supportThread.order", { number: item.order_number })}` : ""}
            </Muted>
            <Badge text={supportStatusLabel(t, item.status)} />
          </Card>
        ))
      )}
    </Screen>
  );
}
