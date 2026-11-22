"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";

/**
 * "Forgot password" (SRS 4.1).
 *
 * The confirmation deliberately does not say whether the address had an
 * account. The API answers the same either way, and a page that said "no
 * account with that email" would undo that by turning this form into a way of
 * testing which addresses are registered.
 */
export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.requestPasswordReset(email.trim());
      setSent(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(Object.keys(cause.fields).length > 0 ? null : cause.message);
      } else {
        setError(t("auth.common.genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("auth.forgot.sentHeading")}</h1>
        </div>
        <Alert tone="success" title={t("auth.forgot.sentTitle")}>
          {t("auth.forgot.sentBodyBefore")}<span className="font-medium">{email.trim()}</span>
          {t("auth.forgot.sentBodyAfter")}
        </Alert>
        <p className="mt-4 text-sm text-foreground-muted">
          {t("auth.forgot.consoleNote")}{" "}
          <Link href="/reset-password" className="font-medium text-brand hover:underline">
            {t("auth.forgot.enterHere")}
          </Link>
          .
        </p>
        <p className="mt-6 text-center text-sm text-foreground-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            {t("auth.forgot.back")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.forgot.heading")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {t("auth.forgot.subtitle")}
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label={t("auth.common.email")}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="dana@biletflow.kz"
          required
          value={email}
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button type="submit" loading={submitting} className="w-full">
          {t("auth.forgot.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        {t("auth.forgot.remembered")}{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("auth.common.signIn")}
        </Link>
      </p>
    </>
  );
}
