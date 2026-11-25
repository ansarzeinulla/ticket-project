"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { CodeInput } from "@/components/code-input";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";

/**
 * "Reset password" (SRS 4.1): the address, the 6-digit code from the email and
 * the new password (BF-100). The forgot-password page shows this form right
 * after sending the code, with the address filled in; /reset-password shows it
 * on its own.
 *
 * Resetting does not sign anybody in. The API deliberately returns no session -
 * proving control of an inbox is not the same as intending to sign in on this
 * device - so this redirects to the login page instead.
 */
export function ResetPasswordForm({ initialEmail, embedded = false }: { initialEmail?: string; embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

  const [email, setEmail] = useState(initialEmail ?? searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Checked here rather than at the API, which has no business knowing the
    // user typed it twice.
    if (password !== confirmation) {
      setFieldErrors({ confirmation: t("auth.common.mismatch") });
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.resetPassword(email.trim(), code, password);
      setDone(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(
          cause.code === "token_invalid"
            ? t("auth.reset.invalid")
            : Object.keys(cause.fields).length > 0
              ? null
              : cause.message,
        );
      } else {
        setError(t("auth.common.genericError"));
      }
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("auth.reset.doneHeading")}</h1>
        </div>
        <Alert tone="success">
          {t("auth.reset.doneBody")}
        </Alert>
        <div className="mt-6">
          <Button className="w-full" onClick={() => router.push("/login")}>
            {t("auth.reset.goSignIn")}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {!embedded && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t("auth.reset.heading")}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("auth.reset.subtitle")}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!embedded && (
          <TextField
            label={t("auth.common.email")}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            error={fieldErrors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
        )}

        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t("auth.reset.code")}</p>
          <CodeInput
            value={code}
            onChange={setCode}
            label={t("auth.reset.code")}
            invalid={Boolean(fieldErrors.code)}
            testID="reset-code"
          />
          {fieldErrors.code ? (
            <p className="text-xs text-danger">{fieldErrors.code}</p>
          ) : (
            <p className="text-xs text-foreground-muted">{t("auth.reset.codeHint")}</p>
          )}
        </div>

        <TextField
          label={t("auth.reset.newPassword")}
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          error={fieldErrors.password}
          hint={t("auth.common.minLengthHint")}
          onChange={(event) => setPassword(event.target.value)}
        />

        <TextField
          label={t("auth.reset.confirm")}
          type="password"
          name="confirmation"
          autoComplete="new-password"
          required
          value={confirmation}
          error={fieldErrors.confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />

        <Button type="submit" loading={submitting} className="w-full">
          {t("auth.reset.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        {t("auth.reset.needCode")}{" "}
        <Link href="/forgot-password" className="font-medium text-brand hover:underline">
          {t("auth.reset.askOne")}
        </Link>
      </p>
    </>
  );
}
