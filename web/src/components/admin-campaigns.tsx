"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { formatKZT } from "@/lib/money";
import type { AdminCampaign } from "@/lib/types";

const STATUS: Record<string, MessageKey> = {
  active: "org.campaigns.status.active",
  disabled: "org.campaigns.status.disabled",
  exhausted: "org.campaigns.status.exhausted",
  expired: "org.campaigns.status.expired",
  draft: "org.campaigns.status.draft",
};

/** SRS 4.12: "Review ... promotional-code activity." */
export function AdminCampaigns() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const [rows, setRows] = useState<AdminCampaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    api
      .adminCampaigns(controller.signal)
      .then(setRows)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("adminTools.campaignsLoadFailed"));
      });
    return () => controller.abort();
  }, [isAdmin, t]);

  if (!isAdmin) {
    return (
      <Alert tone="error" title={t("org.reports.deniedTitle")}>
        {t("org.reports.deniedBody")}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-foreground-muted hover:underline">
          {t("adminTools.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("adminTools.campaignsTitle")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{t("adminTools.campaignsSubtitle")}</p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {rows === null ? (
        !error && (
          <p className="flex items-center gap-2 text-sm text-foreground-muted">
            <Spinner aria-hidden /> {t("org.common.loading")}
          </p>
        )
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle bg-surface p-6 text-center text-sm text-foreground-muted">
          {t("adminTools.none")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full min-w-[44rem] text-sm" data-testid="admin-campaigns">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-foreground-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t("adminTools.colCode")}</th>
                <th className="px-4 py-2 font-medium">{t("adminTools.colEvent")}</th>
                <th className="px-4 py-2 font-medium">{t("adminTools.colStatus")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("adminTools.colRedemptions")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("adminTools.colDiscount")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("adminTools.colRevenue")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border-subtle">
                  <td className="px-4 py-2">
                    <div className="font-mono font-medium">{row.code}</div>
                    <div className="text-xs text-foreground-muted">{row.name}</div>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/events/${row.event_slug}`} className="text-brand hover:underline">
                      {row.event_title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {STATUS[row.status] ? t(STATUS[row.status]) : row.status}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.max_redemptions
                      ? t("adminTools.limited", { used: row.redemption_count, max: row.max_redemptions })
                      : t("adminTools.unlimited", { used: row.redemption_count })}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatKZT(row.discount_given_kzt)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatKZT(row.gross_revenue_kzt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
