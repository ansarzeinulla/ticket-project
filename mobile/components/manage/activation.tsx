import { useCallback, useEffect, useState } from "react";

import { ApiError, api } from "../../lib/client";
import { useT } from "../../lib/i18n/context";
import type { MessageKey } from "../../lib/i18n/dictionaries";
import type { Activation, ActivationStep, ActivationSubmission } from "../../lib/models";
import { formatKZT } from "../../lib/money";
import { Banner, Button, Card, Check, Muted } from "../ui";

const STEPS: { key: ActivationStep; field: keyof ActivationSubmission; title: MessageKey; detail: MessageKey }[] = [
  { key: "identity", field: "confirm_identity", title: "org.activation.identityTitle", detail: "org.activation.identityDetail" },
  { key: "payout", field: "confirm_payout", title: "org.activation.payoutTitle", detail: "org.activation.payoutDetail" },
  { key: "terms", field: "accept_terms", title: "org.activation.termsTitle", detail: "org.activation.termsDetail" },
  { key: "fee", field: "pay_activation_fee", title: "org.activation.feeTitle", detail: "org.activation.feeDetail" },
];

/** Paid-sales activation (SRS 4.5); nothing at all for a free event. */
export function ActivationChecklist({ eventID, onActivated }: { eventID: string; onActivated?: () => void }) {
  const t = useT();
  const [activation, setActivation] = useState<Activation | null>(null);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<ActivationStep>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setActivation(await api.eventActivation(eventID));
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("org.activation.loadFailed"));
    }
  }, [eventID, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    const body: ActivationSubmission = {};
    for (const step of STEPS) if (checked.has(step.key)) body[step.field] = true;
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

  if (!activation) return error ? <Banner tone="error">{error}</Banner> : null;
  if (!activation.required_for_sales) return null;

  if (activation.status === "suspended") {
    return (
      <Banner tone="error" title={t("org.activation.suspendedTitle")}>
        {t("org.activation.suspendedBody")}
        {activation.suspension_reason ? `: ${activation.suspension_reason}` : "."} {t("org.activation.suspendedTail")}
      </Banner>
    );
  }
  if (activation.is_active) {
    return (
      <Banner tone="success" title={t("org.activation.activeTitle")}>
        {t("org.activation.activeBody", {
          date: activation.activated_at ? new Date(activation.activated_at).toLocaleDateString() : t("org.activation.thisEvent"),
          fee: formatKZT(activation.activation_fee_kzt),
        })}
      </Banner>
    );
  }

  const done = STEPS.length - activation.outstanding.length;
  return (
    <Card testID="activation">
      <Banner tone="warning" title={t("org.activation.pendingTitle")}>
        {t("org.activation.pendingBody")}
      </Banner>
      <Muted>{t("org.activation.progress", { done, total: STEPS.length })}</Muted>
      {!open ? (
        <Button title={t("org.activation.open")} onPress={() => setOpen(true)} testID="activation-open" />
      ) : (
        <>
          {STEPS.map((step) => {
            const complete = !activation.outstanding.includes(step.key);
            return (
              <Check
                key={step.key}
                label={
                  t(step.title) +
                  (step.key === "fee" ? ` · ${formatKZT(activation.activation_fee_kzt)} · ${t("org.activation.simulated")}` : "") +
                  (complete ? ` · ${t("org.activation.done")}` : "")
                }
                hint={t(step.detail)}
                value={complete || checked.has(step.key)}
                disabled={complete || submitting}
                onChange={() =>
                  setChecked((current) => {
                    const next = new Set(current);
                    if (next.has(step.key)) next.delete(step.key);
                    else next.add(step.key);
                    return next;
                  })
                }
              />
            );
          })}
          {error ? <Banner tone="error">{error}</Banner> : null}
          <Button
            title={
              checked.size === activation.outstanding.length
                ? t("org.activation.complete")
                : checked.size === 1
                  ? t("org.activation.saveOne")
                  : t("org.activation.saveMany", { count: checked.size || "no" })
            }
            loading={submitting}
            disabled={checked.size === 0}
            onPress={() => void submit()}
            testID="activation-submit"
          />
          <Muted>{t("org.activation.note")}</Muted>
          <Button variant="ghost" title={t("org.activation.close")} disabled={submitting} onPress={() => setOpen(false)} />
        </>
      )}
    </Card>
  );
}
