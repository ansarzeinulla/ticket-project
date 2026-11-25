"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";

/** Matches the API's minimum; checked here so the error appears instantly. */
const MIN_PASSWORD_LENGTH = 8;

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const t = useT();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Confirmation is a UI-only concern; the API never sees it.
    if (password !== confirm) {
      setFieldErrors({ confirm: t("auth.common.mismatch") });
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({
        password: t("auth.register.tooShort", { min: MIN_PASSWORD_LENGTH }),
      });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        // The API derives a name from the email when this is omitted.
        full_name: fullName.trim() || undefined,
      });
      router.replace("/");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setFormError(
          error.code === "conflict"
            ? t("auth.register.exists")
            : error.fields && Object.keys(error.fields).length > 0
              ? t("auth.common.fixFields")
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
        <h1 className="text-3xl font-bold">{t("auth.register.heading")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {t("auth.register.subtitle")}
        </p>
      </div>

      {formError && (
        <div className="mb-4">
          <Alert tone="error">{formError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label={t("auth.register.fullName")}
          name="full_name"
          autoComplete="name"
          placeholder="Dana Amirova"
          hint={t("auth.register.fullNameHint")}
          value={fullName}
          error={fieldErrors.full_name}
          disabled={submitting}
          onChange={(event) => setFullName(event.target.value)}
        />

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
          autoComplete="new-password"
          placeholder={t("auth.common.minLength")}
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          error={fieldErrors.password}
          disabled={submitting}
          onChange={(event) => setPassword(event.target.value)}
        />

        <TextField
          label={t("auth.register.confirm")}
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          required
          value={confirm}
          error={fieldErrors.confirm}
          disabled={submitting}
          onChange={(event) => setConfirm(event.target.value)}
        />

        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground-muted">
        {t("auth.register.already")}{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("auth.common.signIn")}
        </Link>
      </p>
    </>
  );
}
