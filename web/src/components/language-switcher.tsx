"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

/**
 * The language switcher (SRS §685).
 *
 * It writes the choice through a route handler so the cookie is set with the
 * right attributes on the server, then `router.refresh()` re-renders every
 * Server Component in the new language - the event page, its metadata, the
 * catalogue - not just the client islands. A plain client-side cookie write
 * would leave the server-rendered half in the old language until a hard reload.
 *
 * Three real buttons rather than a `<select>`: there are only three locales, a
 * radio group is more accessible than a menu, and each label is in its own
 * language so a visitor recognises theirs without reading the others.
 */
export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  return (
    <div
      className={`inline-flex items-center divide-x text-xs ${dark ? "divide-white/20" : "divide-border-subtle"}`}
      role="radiogroup"
      aria-label={localeNames[locale]}
      data-testid="language-switcher"
    >
      {locales.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            onClick={() => choose(option)}
            aria-label={localeNames[option]}
            title={localeNames[option]}
            className={`px-2 py-1 font-semibold tracking-wide transition-colors ${
              active
                ? dark ? "text-white" : "text-brand"
                : dark ? "text-top-muted hover:text-white" : "text-foreground-muted hover:text-foreground"
            } disabled:opacity-60`}
            data-testid={`locale-${option}`}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
