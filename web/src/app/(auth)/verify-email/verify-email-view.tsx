"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";

/**
 * Email confirmation (SRS 4.1) with the 6-digit code from the email (BF-100).
 * A signed-in visitor usually confirms from the banner instead; this page is
 * for anyone who is not signed in, so it also asks for the address.
 */
export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const t = useT();
  const { user, refresh } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") ?? user?.email ?? "");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("working");
    setError(null);
    setFieldErrors({});
    try {
      await api.verifyEmail(email.trim(), code);
      setState("done");
      if (user) await refresh();
    } catch (cause) {
      if (cause instanceof ApiError && Object.keys(cause.fields).length > 0) {
        setFieldErrors(cause.fields);
      } else {
        setError(cause instanceof ApiError ? t("auth.verify.invalid") : t("auth.common.genericError"));
      }
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("auth.verify.doneHeading")}</h1>
        </div>
        <Alert tone="success">{t("auth.verify.doneBody")}</Alert>
        <p className="mt-6 text-center text-sm text-foreground-muted">
          <Link href={user ? "/" : "/login"} className="font-medium text-brand hover:underline">
            {user ? t("notFound.back") : t("auth.verify.continue")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("auth.verify.heading")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{t("auth.verify.subtitle")}</p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <TextField
          label={t("auth.common.email")}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label={t("auth.verify.code")}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          hint={t("auth.verify.codeHint")}
          error={fieldErrors.code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, "").slice(0, 6))}
        />
        <Button type="submit" className="w-full" loading={state === "working"} disabled={code.length !== 6}>
          {t("auth.verify.submit")}
        </Button>
      </form>
    </>
  );
}
