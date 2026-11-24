import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";

import { Badge, Banner, Body, Button, Card, Empty, KV, Loading, Muted, Row, Screen, Title } from "../../components/ui";
import { useAuth } from "../../lib/auth-context";
import { ApiError, api } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import { campaignStatusLabel } from "../../lib/labels";
import type { AdminCampaign } from "../../lib/models";
import { formatKZT } from "../../lib/money";

/** Every promo campaign on the platform (SRS 4.11, 4.12). */
export default function AdminCampaignsScreen() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const [rows, setRows] = useState<AdminCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .adminCampaigns()
      .then(setRows)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : t("adminTools.campaignsLoadFailed")));
  }, [isAdmin, t]);

  if (!isAdmin) {
    return (
      <Screen>
        <Banner tone="error" title={t("org.reports.deniedTitle")}>{t("org.reports.deniedBody")}</Banner>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t("adminTools.campaignsTitle") }} />
      <Title>{t("adminTools.campaignsTitle")}</Title>
      <Muted>{t("adminTools.campaignsSubtitle")}</Muted>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {rows === null ? (
        error ? null : <Loading label={t("org.common.loading")} />
      ) : rows.length === 0 ? (
        <Empty>{t("adminTools.none")}</Empty>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <Row>
              <Body>{row.code}</Body>
              <Badge text={campaignStatusLabel(t, row.status)} />
            </Row>
            <Muted>{row.name}</Muted>
            <Button small variant="ghost" title={row.event_title} onPress={() => router.push(`/event/${row.event_slug}`)} />
            <Row>
              <KV
                label={t("adminTools.colRedemptions")}
                value={
                  row.max_redemptions
                    ? t("adminTools.limited", { used: row.redemption_count, max: row.max_redemptions })
                    : t("adminTools.unlimited", { used: row.redemption_count })
                }
              />
              <KV label={t("adminTools.colDiscount")} value={formatKZT(row.discount_given_kzt)} />
              <KV label={t("adminTools.colRevenue")} value={formatKZT(row.gross_revenue_kzt)} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
