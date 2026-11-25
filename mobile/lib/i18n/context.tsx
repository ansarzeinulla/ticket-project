import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getPref, setPref } from "../prefs";
import { asLocale, defaultLocale, type Locale } from "./config";
import { getDictionaryFor } from "./dictionaries";
import { translatorFor, type Translator } from "./translate";
import { setRequestLocale } from "../client";

const LOCALE_KEY = "biletflow.locale";

interface I18nValue {
  locale: Locale;
  t: Translator;
  setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/** The phone's own language if BiletFlow speaks it, otherwise Kazakh. */
function deviceLocale(): Locale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().split("-")[0];
    return asLocale(tag) ?? defaultLocale;
  } catch {
    return defaultLocale;
  }
}

/**
 * The same three languages and the same catalogues as the website (SRS 7):
 * a saved choice wins, then the phone's language, then Kazakh.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  useEffect(() => {
    void getPref(LOCALE_KEY).then((saved) => {
      const parsed = asLocale(saved ?? undefined);
      if (parsed) setLocaleState(parsed);
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void setPref(LOCALE_KEY, next);
  }, []);

  // Requests carry the language too, for the emails they trigger.
  useEffect(() => setRequestLocale(locale), [locale]);

  const value = useMemo<I18nValue>(
    () => ({ locale, t: translatorFor(getDictionaryFor(locale)), setLocale }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within an I18nProvider");
  return value;
}

export function useT(): Translator {
  return useI18n().t;
}
