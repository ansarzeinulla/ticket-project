"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const t = useT();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Where to land after signing in. Only same-site paths are honoured, so a
   * crafted ?next=https://evil.example cannot turn this into an open redirect.
   */
  const nextParam = searchParams.get("next");
  const destination = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      await login(email.trim(), password);
      router.replace(destination);
      // Re-render server components so the gate sees the new cookie.
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setFormError(
          error.code === "invalid_credentials"
            ? t("auth.login.invalid")
            : error.message,
        );
      } else {
        setFormError(t("auth.common.genericError"));
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("auth.login.heading")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {t("auth.login.subtitle")}
        </p>
      </div>

      {formError && (
        <div className="mb-4">
          <Alert tone="error">{formError}</Alert>
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
          disabled={submitting}
          onChange={(event) => setEmail(event.target.value)}
        />

        <TextField
          label={t("auth.common.password")}
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={password}
          error={fieldErrors.password}
          disabled={submitting}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-foreground-muted hover:text-brand hover:underline"
        >
          {t("auth.login.forgot")}
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-foreground-muted">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          {t("auth.login.createOne")}
        </Link>
      </p>
    </>
  );
}
