"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CaseList } from "@/components/platform-support";
import { SupportThreadView } from "@/components/support-thread";
import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";
import type { SupportCase } from "@/lib/types";

/** Platform admins' inbox of organizer requests (SRS 4.12, 4.13). */
export function PlatformInbox() {
  const t = useT();
  const { user } = useAuth();
  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCaseID, setOpenCaseID] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setCases(await api.platformSupportCases(signal));
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("platformInbox.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load, isAdmin]);

  if (!isAdmin) {
    return (
      <Alert tone="error" title={t("org.reports.deniedTitle")}>
        {t("org.reports.deniedBody")}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-foreground-muted hover:underline">
            {t("platformInbox.back")}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("platformInbox.title")}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{t("platformInbox.subtitle")}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          {t("org.common.refresh")}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {openCaseID && (
        <SupportThreadView
          caseID={openCaseID}
          onClose={() => setOpenCaseID(null)}
          onChanged={(thread) =>
            setCases((current) =>
              current.map((item) => (item.id === thread.case.id ? thread.case : item)),
            )
          }
        />
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-foreground-muted">
          <Spinner aria-hidden /> {t("org.common.loading")}
        </p>
      ) : cases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle bg-surface p-6 text-center text-sm text-foreground-muted">
          {t("platformInbox.none")}
        </p>
      ) : (
        <CaseList cases={cases} onOpen={setOpenCaseID} showRequester />
      )}
    </div>
  );
}
