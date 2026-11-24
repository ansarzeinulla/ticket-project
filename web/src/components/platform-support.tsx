"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { SupportThreadView } from "@/components/support-thread";
import { Alert } from "@/components/ui/alert";
import { Button, Spinner } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/field";
import { ApiError, api } from "@/lib/api";
import { useT } from "@/lib/i18n/context";
import { STATUS_STYLES, supportCategoryLabel, supportStatusLabel } from "@/lib/support";
import type { SupportCase } from "@/lib/types";

/** The categories that make sense for a request to BiletFlow itself. */
const PLATFORM_CATEGORIES = ["account", "payment", "technical"] as const;

/**
 * An organizer's requests to BiletFlow (SRS 4.13: "An organizer shall be able
 * to open a platform-support request concerning account, activation, payment,
 * or technical issues"). Platform admins answer them in /admin/support.
 */
export function PlatformSupport() {
  const t = useT();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCaseID, setOpenCaseID] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const [category, setCategory] = useState<string>("account");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const mine = await api.mySupportCases(signal);
        setCases(mine.filter((item) => item.kind === "organizer"));
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof ApiError ? cause.message : t("platformSupport.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Every setState in `load` happens after its await; the rule cannot see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!subject.trim()) errors.subject = t("platformSupport.subjectRequired");
    if (!message.trim()) errors.message = t("platformSupport.messageRequired");
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const thread = await api.openSupportCase({
        kind: "organizer",
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setCases((current) => [thread.case, ...current]);
      setOpenCaseID(thread.case.id);
      setComposing(false);
      setSubject("");
      setMessage("");
    } catch (cause) {
      if (cause instanceof ApiError) {
        setFieldErrors(cause.fields);
        setError(Object.keys(cause.fields).length > 0 ? null : cause.message);
      } else {
        setError(t("platformSupport.openFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("platformSupport.title")}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{t("platformSupport.subtitle")}</p>
        </div>
        {!composing && (
          <Button onClick={() => setComposing(true)} data-testid="platform-support-new">
            {t("platformSupport.open")}
          </Button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {composing && (
        <form
          onSubmit={submit}
          noValidate
          className="space-y-4 rounded-xl border border-border-subtle bg-surface p-5"
        >
          <h2 className="text-sm font-semibold">{t("platformSupport.newHeading")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={t("platformSupport.category")}
              name="category"
              options={PLATFORM_CATEGORIES}
              optionLabel={(option) => supportCategoryLabel(t, option)}
              value={category}
              disabled={submitting}
              onChange={(event) => setCategory(event.target.value)}
            />
            <TextField
              label={t("platformSupport.subject")}
              name="subject"
              placeholder={t("platformSupport.subjectPlaceholder")}
              required
              value={subject}
              error={fieldErrors.subject}
              disabled={submitting}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="platform-support-message" className="block text-sm font-medium">
              {t("platformSupport.message")}
            </label>
            <textarea
              id="platform-support-message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("platformSupport.messagePlaceholder")}
              disabled={submitting}
              className="w-full resize-y rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm"
            />
            {fieldErrors.message && <p className="text-xs text-danger">{fieldErrors.message}</p>}
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={submitting}>
              {t("platformSupport.send")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setComposing(false)}
            >
              {t("platformSupport.cancel")}
            </Button>
          </div>
        </form>
      )}

      {openCaseID && (
        <SupportThreadView
          caseID={openCaseID}
          onClose={() => setOpenCaseID(null)}
          onChanged={(thread) =>
            setCases((current) =>
              current.map((item) => (item.id === thread.case.id ? thread.case : item)),
            )
          }
        />
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-foreground-muted">
          <Spinner aria-hidden /> {t("org.common.loading")}
        </p>
      ) : cases.length === 0 ? (
        !composing && (
          <p className="rounded-xl border border-dashed border-border-subtle bg-surface p-6 text-center text-sm text-foreground-muted">
            {t("platformSupport.none")}
          </p>
        )
      ) : (
        <CaseList cases={cases} onOpen={setOpenCaseID} />
      )}
    </div>
  );
}

/** A compact list of cases; shared by the organizer page and the admin inbox. */
export function CaseList({
  cases,
  onOpen,
  showRequester = false,
}: {
  cases: SupportCase[];
  onOpen: (id: string) => void;
  showRequester?: boolean;
}) {
  const t = useT();
  return (
    <ul className="space-y-2" data-testid="platform-cases">
      {cases.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface px-4 py-3 text-left hover:bg-surface-muted"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{item.subject}</span>
              <span className="text-xs text-foreground-muted">
                {item.case_number} · {supportCategoryLabel(t, item.category)}
                {showRequester && ` · ${t("platformInbox.from", { name: item.requester_name })}`}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}
            >
              {supportStatusLabel(t, item.status)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
