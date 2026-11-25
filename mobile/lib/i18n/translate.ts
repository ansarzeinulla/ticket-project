import type { Dictionary, MessageKey } from "./dictionaries";

/**
 * Resolve a dotted message key against a dictionary and fill `{name}`
 * placeholders.
 *
 * A missing key returns the key itself rather than an empty string: a visible
 * "checkout.title" on the page is a bug that gets fixed, whereas a blank space
 * is one that ships. In practice the typed `MessageKey` stops it happening at
 * all.
 */
export function translate(
  dict: Dictionary,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const raw = key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in node) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);

  if (typeof raw !== "string") return key;
  if (!params) return raw;

  return raw
    .replace(/\{(\w+)\|([^|}]*)\|([^|}]*)\|([^|}]*)\}/g, (match, name: string, one: string, few: string, many: string) =>
      name in params ? russianPlural(Number(params[name]), one, few, many) : match,
    )
    .replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/**
 * Russian nouns take three forms after a number: 1 билет, 2 билета, 5 билетов
 * (21 билет, 22 билета, 11 билетов). A message writes them as
 * "{count|билет|билета|билетов}".
 */
export function russianPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** A bound translator: `t("checkout.title")`. */
export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

export function translatorFor(dict: Dictionary): Translator {
  return (key, params) => translate(dict, key, params);
}
