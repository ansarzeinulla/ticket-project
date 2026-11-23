"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";

/**
 * Email confirmation (SRS 4.1).
 *
 * A token in the URL is redeemed on arrival, because that is what clicking the
 * link is meant to do. Without one the page offers a field, since in this MVP
 * the code is read off the API console.
 */
export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const linkToken = searchParams.get("token");
  const t = useT();

  const [token, setToken] = useState(linkToken ?? "");
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">(
    linkToken ? "working" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkToken) return;

    let cancelled = false;
    void (async () => {
      try {
        await api.verifyEmail(linkToken);
        if (!cancelled) setState("done");
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof ApiError
            ? t("auth.verify.invalid")
            : t("auth.common.genericError"),
        );
        setState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [linkToken, t]);

  async function submitTyped() {
    setState("working");
    setError(null);
    try {
      await api.verifyEmail(token.trim());
      setState("done");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? t("auth.verify.invalid")
          : t("auth.common.genericError"),
      );
      setState("failed");
    }
  }

  if (state === "done") {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("auth.verify.doneHeading")}</h1>
        </div>
        <Alert tone="success">{t("auth.verify.doneBody")}</Alert>
        <p className="mt-6 text-center text-sm text-foreground-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            {t("auth.verify.continue")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.verify.heading")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {state === "working"
            ? t("auth.verify.checking")
            : t("auth.verify.subtitle")}
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="space-y-4">
        <TextField
          label={t("auth.verify.code")}
          name="token"
          value={token}
          disabled={state === "working"}
          hint={t("auth.verify.codeHint")}
          onChange={(event) => setToken(event.target.value)}
        />
        <Button
          className="w-full"
          loading={state === "working"}
          disabled={token.trim() === ""}
          onClick={() => void submitTyped()}
        >
          {t("auth.verify.submit")}
        </Button>
      </div>
    </>
  );
}
