"use client";

import { useCallback, useEffect, useState } from "react";

import { SupportThreadView } from "@/components/support-thread";
import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";
import {
  STATUS_STYLES,
  formatMessageTime,
  supportCategoryLabel,
  supportStatusLabel,
} from "@/lib/support";
import type { SupportCase } from "@/lib/types";

/** How often the inbox re-checks for new cases while it is on screen. */
const POLL_INTERVAL_MS = 15_000;

/** The organizer's support inbox for one event. */
export function SupportInbox({ eventID }: { eventID: string }) {
  const t = useT();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [openCaseID, setOpenCaseID] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setCases(await api.eventSupportCases(eventID, signal));
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.inbox.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [eventID, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Keep the list current while an organizer has the page open.
  useEffect(() => {
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const openCount = cases.filter((item) => item.status !== "resolved").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("orderSupport.heading")}</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {loading
              ? t("org.common.loading")
              : cases.length === 0
                ? t("org.inbox.noneYet")
                : `${cases.length === 1 ? t("org.inbox.caseOne") : t("org.inbox.caseMany", { count: cases.length })} · ${t("org.inbox.needReply", { count: openCount })}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          {t("org.common.refresh")}
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading && cases.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-6 text-sm text-foreground-muted">
          <Spinner />
          {t("org.inbox.loading")}
        </div>
      ) : cases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-subtle bg-surface p-6 text-center text-sm text-foreground-muted">
          {t("org.inbox.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {cases.map((item) => (
            <li key={item.id} className="space-y-2">
              <button
                type="button"
                onClick={() => setOpenCaseID(openCaseID === item.id ? null : item.id)}
                aria-expanded={openCaseID === item.id}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface px-5 py-4 text-left hover:bg-surface-muted"
                data-testid="inbox-case"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.subject}</span>
                  <span className="text-xs text-foreground-muted">
                    {item.case_number} · {supportCategoryLabel(t, item.category)} ·{" "}
                    {t("supportThread.from", { name: item.requester_name })}
                    {item.order_number ? ` · ${t("supportThread.order", { number: item.order_number })}` : ""}
                    {item.last_message_at
                      ? ` · ${formatMessageTime(item.last_message_at)}`
                      : ""}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}
                >
                  {supportStatusLabel(t, item.status)}
                </span>
              </button>

              {openCaseID === item.id && (
                <SupportThreadView
                  caseID={item.id}
                  onClose={() => setOpenCaseID(null)}
                  onChanged={(thread) =>
                    setCases((current) =>
                      current.map((existing) =>
                        existing.id === thread.case.id ? thread.case : existing,
                      ),
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
