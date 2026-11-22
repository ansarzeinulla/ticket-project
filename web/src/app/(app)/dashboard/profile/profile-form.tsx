"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { OrganizerProfile, ProfilePatch } from "@/lib/types";

/**
 * The organizer's profile and account settings (SRS 4.1: "Organizers shall
 * have a profile containing contact and payout information"; "Users shall be
 * able to sign in, sign out, and reset passwords").
 *
 * Two forms on one page because they are two different risks: contact details
 * are a save, a password change needs the current password even though the
 * caller is already signed in.
 *
 * The payout destination is shown, never edited here. It is registered by the
 * paid-sales activation checklist, and NFR section 7 means the platform holds
 * nothing but an opaque reference and a masked display value — there is no
 * account number to type.
 */
export function ProfileForm() {
  const { user } = useAuth();
  const t = useT();

  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [values, setValues] = useState({
    display_name: "",
    legal_name: "",
    contact_email: "",
    contact_phone: "",
    description: "",
    website_url: "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.getProfile(signal);
      setProfile(data.profile);
      setValues({
        display_name: data.profile.display_name ?? "",
        legal_name: data.profile.legal_name ?? "",
        contact_email: data.profile.contact_email ?? "",
        contact_phone: data.profile.contact_phone ?? "",
        description: data.profile.description ?? "",
        website_url: data.profile.website_url ?? "",
      });
      setLoadError(null);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setLoadError(cause instanceof ApiError ? cause.message : t("org.profile.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSaved(false);
    setSaving(true);

    // An emptied field is sent as an explicit null, which is how the API
    // clears a column; the tri-state is why the profile PATCH exists.
    const patch: ProfilePatch = {};
    for (const key of Object.keys(values) as (keyof typeof values)[]) {
      const trimmed = values[key].trim();
      patch[key] = trimmed === "" ? null : trimmed;
    }

    try {
      const data = await api.updateProfile(patch);
      setProfile(data.profile);
      setSaved(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setFormError(
          Object.keys(cause.fields).length > 0
            ? t("auth.common.fixFields")
            : cause.message,
        );
      } else {
        setFormError(t("auth.common.genericError"));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-foreground-muted">
        <Spinner aria-hidden /> {t("org.profile.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-foreground-muted hover:underline">
          {t("org.detail.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("org.titles.profile")}</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          {t("org.profile.signedInAs", { email: user?.email ?? "" })}
        </p>
      </div>

      {loadError && <Alert tone="error">{loadError}</Alert>}
      {formError && <Alert tone="error">{formError}</Alert>}
      {saved && <Alert tone="success">{t("org.profile.saved")}</Alert>}

      <form
        onSubmit={save}
        noValidate
        className="space-y-5 rounded-xl border border-border-subtle bg-surface p-6"
      >
        <h2 className="text-base font-semibold">{t("org.profile.details")}</h2>

        <TextField
          label={t("org.profile.displayName")}
          name="display_name"
          placeholder="Dana Events"
          hint={t("org.profile.displayNameHint")}
          value={values.display_name}
          error={fieldErrors.display_name}
          disabled={saving}
          onChange={(event) => update("display_name", event.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("org.profile.legalName")}
            name="legal_name"
            placeholder="Dana Events LLP"
            value={values.legal_name}
            error={fieldErrors.legal_name}
            disabled={saving}
            onChange={(event) => update("legal_name", event.target.value)}
          />
          <TextField
            label={t("org.profile.website")}
            name="website_url"
            placeholder="https://danaevents.kz"
            value={values.website_url}
            error={fieldErrors.website_url}
            disabled={saving}
            onChange={(event) => update("website_url", event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("org.profile.contactEmail")}
            type="email"
            name="contact_email"
            placeholder="hello@danaevents.kz"
            hint={t("org.profile.contactEmailHint")}
            value={values.contact_email}
            error={fieldErrors.contact_email}
            disabled={saving}
            onChange={(event) => update("contact_email", event.target.value)}
          />
          <TextField
            label={t("org.profile.contactPhone")}
            name="contact_phone"
            placeholder="+7 700 000 0000"
            value={values.contact_phone}
            error={fieldErrors.contact_phone}
            disabled={saving}
            onChange={(event) => update("contact_phone", event.target.value)}
          />
        </div>

        <TextAreaField
          label={t("org.profile.about")}
          name="description"
          placeholder={t("org.profile.aboutPlaceholder")}
          value={values.description}
          error={fieldErrors.description}
          disabled={saving}
          onChange={(value) => update("description", value)}
        />

        <div className="border-t border-border-subtle pt-5">
          <Button type="submit" loading={saving} data-testid="save-profile">
            {saving ? t("org.form.saving") : t("org.profile.save")}
          </Button>
        </div>
      </form>

      <PayoutSection profile={profile} />
      <PasswordSection />
    </div>
  );
}

/**
 * The payout destinations, read-only and masked (SRS 4.1, NFR section 7).
 */
const PAYOUT_STATUS: Record<string, MessageKey> = {
  unverified: "org.profile.payoutStatus.unverified",
  pending_review: "org.profile.payoutStatus.pending_review",
  verified: "org.profile.payoutStatus.verified",
  rejected: "org.profile.payoutStatus.rejected",
};

function PayoutSection({ profile }: { profile: OrganizerProfile | null }) {
  const t = useT();
  const accounts = profile?.payout_accounts ?? [];

  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-6">
      <h2 className="text-base font-semibold">{t("org.profile.payout")}</h2>

      {accounts.length === 0 ? (
        <p className="mt-2 text-sm text-foreground-muted">
          {t("org.profile.payoutNone")}
        </p>
      ) : (
        <ul className="mt-3 space-y-3" data-testid="payout-accounts">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle px-4 py-3"
            >
              <div>
                <div className="font-mono text-sm">{account.masked_account ?? "••••"}</div>
                <p className="text-xs text-foreground-muted">
                  {account.provider} · {account.currency}
                  {account.is_simulated && ` · ${t("org.activation.simulated")}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  account.status === "verified"
                    ? "bg-success-soft text-success"
                    : "bg-surface-muted text-foreground-muted"
                }`}
              >
                {PAYOUT_STATUS[account.status] ? t(PAYOUT_STATUS[account.status]) : account.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-foreground-muted">
        {t("org.profile.payoutNote")}
      </p>
    </section>
  );
}

/** Changing the password of an already-signed-in account (SRS 4.1). */
function PasswordSection() {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setDone(false);

    if (next !== confirm) {
      setFieldErrors({ confirm: t("auth.common.mismatch") });
      return;
    }

    setBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        if (Object.keys(cause.fields).length === 0) setError(cause.message);
      } else {
        setError(t("org.profile.passwordFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border-subtle bg-surface p-6">
      <h2 className="text-base font-semibold">{t("auth.common.password")}</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        {t("org.profile.passwordNote")}
      </p>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {done && (
        <div className="mt-4">
          <Alert tone="success">{t("org.profile.passwordChanged")}</Alert>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-4 space-y-4">
        <TextField
          label={t("org.profile.currentPassword")}
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
          value={current}
          error={fieldErrors.current_password}
          disabled={busy}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("auth.reset.newPassword")}
            type="password"
            name="new_password"
            autoComplete="new-password"
            required
            hint={t("auth.common.minLengthHint")}
            value={next}
            error={fieldErrors.new_password}
            disabled={busy}
            onChange={(event) => setNext(event.target.value)}
          />
          <TextField
            label={t("auth.reset.confirm")}
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            required
            value={confirm}
            error={fieldErrors.confirm}
            disabled={busy}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        <Button type="submit" loading={busy} data-testid="change-password">
          {t("auth.reset.submit")}
        </Button>
      </form>
    </section>
  );
}
