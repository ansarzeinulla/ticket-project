"use client";

import { useState } from "react";

import { CodeInput } from "@/components/code-input";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";

/**
 * Confirming the account's address with the emailed 6-digit code (SRS 4.1,
 * BF-100), at the top of the profile page. Gone once the address is confirmed.
 */
export function ConfirmEmailCard() {
  const t = useT();
  const { user, refresh } = useAuth();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "sending" | "sent" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;
  if (state === "done") {
    return (
      <p className="rounded-lg bg-success-soft px-5 py-4 text-sm font-semibold text-success" data-testid="confirm-email-done">
        {t("home.verifyDone")}
      </p>
    );
  }
  if (user.email_verified_at) return null;

  async function confirm(next: string) {
    if (!user || next.length !== 6) return;
    setState("checking");
    setError(null);
    try {
      await api.verifyEmail(user.email, next);
      setState("done");
      await refresh();
    } catch (cause) {
      setState("idle");
      setCode("");
      setError(cause instanceof ApiError && cause.code !== "token_invalid" && cause.fields.code === undefined
        ? cause.message
        : t("auth.verify.invalid"));
    }
  }

  async function resend() {
    setState("sending");
    setError(null);
    try {
      await api.requestEmailVerification();
      setState("sent");
    } catch (cause) {
      setState("idle");
      setError(cause instanceof ApiError ? cause.message : t("auth.common.genericError"));
    }
  }

  return (
    <section
      id="confirm-email"
      className="scroll-mt-32 space-y-4 rounded-lg border-2 border-brand/30 bg-surface p-6"
      data-testid="confirm-email-card"
    >
      <div>
        <h2 className="text-lg font-bold">{t("home.verifySection")}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{t("home.verifySectionBody", { email: user.email })}</p>
      </div>
      <CodeInput
        value={code}
        onChange={(next) => {
          setCode(next);
          setError(null);
          if (next.length === 6) void confirm(next);
        }}
        disabled={state === "checking"}
        invalid={Boolean(error)}
        label={t("home.verifyCode")}
        testID="verify-email-code"
      />
      {error && (
        <p className="text-sm text-danger" data-testid="verify-email-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void confirm(code)} loading={state === "checking"} disabled={code.length !== 6} data-testid="verify-email-confirm">
          {t("home.verifyConfirm")}
        </Button>
        {state === "sent" ? (
          <span className="text-sm font-semibold text-success">{t("home.verifySent")}</span>
        ) : (
          <Button variant="secondary" onClick={() => void resend()} loading={state === "sending"} data-testid="verify-email-resend">
            {t("home.verifyResend")}
          </Button>
        )}
      </div>
    </section>
  );
}
