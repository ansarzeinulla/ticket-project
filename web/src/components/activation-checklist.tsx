"use client";

import { useCallback, useEffect, useState } from "react";

import { IdentityCheck } from "@/components/identity-check";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { formatDay } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { formatKZT } from "@/lib/money";
import type { Activation, ActivationStep, ActivationSubmission } from "@/lib/types";

/**
 * The checklist, in the order the organizer works through it.
 *
 * `key` matches the server's `outstanding` values, so what is ticked here is
 * decided by the API rather than by this file keeping its own tally.
 */
const STEPS: {
  key: ActivationStep;
  field: keyof ActivationSubmission;
  title: MessageKey;
  detail: MessageKey;
}[] = [
  {
    key: "identity",
    field: "confirm_identity",
    title: "org.activation.identityTitle",
    detail: "org.activation.identityDetail",
  },
  {
    key: "payout",
    field: "confirm_payout",
    title: "org.activation.payoutTitle",
    detail: "org.activation.payoutDetail",
  },
  {
    key: "terms",
    field: "accept_terms",
    title: "org.activation.termsTitle",
    detail: "org.activation.termsDetail",
  },
  {
    key: "fee",
    field: "pay_activation_fee",
    title: "org.activation.feeTitle",
    detail: "org.activation.feeDetail",
  },
];

/**
 * Paid-sales activation for one event (SRS 4.5).
 *
 * Renders nothing at all when the event has no paid tickets: activation exists
 * to clear an organizer to take money, and nagging about a checklist that
 * gates nothing is noise.
 */
export function ActivationChecklist({
  eventID,
  onActivated,
}: {
  eventID: string;
  onActivated?: () => void;
}) {
  const { t, locale } = useI18n();
  const [activation, setActivation] = useState<Activation | null>(null);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<ActivationStep>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const next = await api.eventActivation(eventID, signal);
        setActivation(next);
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("org.activation.loadFailed"));
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

  const toggle = (step: ActivationStep) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  async function submit() {
    if (!activation) return;

    const body: ActivationSubmission = {};
    for (const step of STEPS) {
      if (checked.has(step.key)) body[step.field] = true;
    }

    setSubmitting(true);
    try {
      const next = await api.advanceActivation(eventID, body);
      setActivation(next);
      setChecked(new Set());
      setError(null);
      if (next.is_active) {
        setOpen(false);
        onActivated?.();
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.activation.activateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !activation) return null;

  // A free event never needs activating.
  if (!activation.required_for_sales) return null;

  if (activation.status === "suspended") {
    return (
      <Alert tone="error" title={t("org.activation.suspendedTitle")}>
        {t("org.activation.suspendedBody")}
        {activation.suspension_reason ? `: ${activation.suspension_reason}` : "."}{" "}
        {t("org.activation.suspendedTail")}
      </Alert>
    );
  }

  if (activation.is_active) {
    return (
      <Alert tone="success" title={t("org.activation.activeTitle")}>
        {t("org.activation.activeBody", {
          date: activation.activated_at
            ? formatDay(activation.activated_at, locale)
            : t("org.activation.thisEvent"),
          fee: formatKZT(activation.activation_fee_kzt),
        })}
      </Alert>
    );
  }

  const done = STEPS.length - activation.outstanding.length;

  return (
    <div className="rounded-lg border border-warning/40 bg-warning-soft/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="font-semibold text-foreground">
            {t("org.activation.pendingTitle")}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("org.activation.pendingBody")}
          </p>
          <p className="mt-2 text-xs text-foreground-muted">
            {t("org.activation.progress", { done, total: STEPS.length })}
          </p>
        </div>

        {!open && (
          <Button onClick={() => setOpen(true)}>{t("org.activation.open")}</Button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border-subtle pt-4">
          {STEPS.map((step) => {
            const complete = !activation.outstanding.includes(step.key);
            return (
              <label
                key={step.key}
                className={`flex gap-3 rounded-lg border p-3 ${
                  complete
                    ? "border-success/30 bg-success-soft/40"
                    : "border-border-subtle bg-surface"
                } ${complete ? "" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-brand"
                  checked={complete || checked.has(step.key)}
                  // Identity is ticked by the document check below, not by hand (BF-100).
                  disabled={complete || submitting || step.key === "identity"}
                  onChange={() => toggle(step.key)}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {t(step.title)}
                    {step.key === "fee" && (
                      <span className="text-xs font-normal text-foreground-muted">
                        {formatKZT(activation.activation_fee_kzt)} · {t("org.activation.simulated")}
                      </span>
                    )}
                    {complete && (
                      <span className="text-xs font-normal text-success">{t("org.activation.done")}</span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-foreground-muted">
                    {t(step.detail)}
                  </span>
                  {step.key === "identity" && !complete && (
                    <IdentityCheck
                      disabled={submitting}
                      onVerified={() => setChecked((current) => new Set(current).add("identity"))}
                    />
                  )}
                </span>
              </label>
            );
          })}

          {error && <Alert>{error}</Alert>}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void submit()} loading={submitting} disabled={checked.size === 0}>
              {checked.size === activation.outstanding.length
                ? t("org.activation.complete")
                : checked.size === 1
                  ? t("org.activation.saveOne")
                  : t("org.activation.saveMany", { count: checked.size || "no" })}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              {t("org.activation.close")}
            </Button>
            <span className="text-xs text-foreground-muted">
              {t("org.activation.note")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
