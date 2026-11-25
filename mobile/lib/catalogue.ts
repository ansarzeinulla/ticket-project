import type { MessageKey } from "./i18n/dictionaries";

/**
 * The storefront's fixed vocabularies (BF-100). The event form offers these
 * categories, the header's strip filters on them, and the city picker maps to
 * the API's `city` filter.
 */
export const CATEGORIES = ["concerts", "theatre", "standup", "sports", "kids", "workshops", "shows"] as const;
export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

/** A category label in the reader's language, or the raw value for an old free-text one. */
export function categoryLabel(t: (key: MessageKey) => string, value?: string | null): string {
  if (!value) return "";
  return isCategory(value) ? t(`categories.${value}` as MessageKey) : value;
}

export const CITIES = ["almaty", "astana", "shymkent"] as const;
export type City = (typeof CITIES)[number];

export function isCity(value: unknown): value is City {
  return typeof value === "string" && (CITIES as readonly string[]).includes(value);
}

/** What the event form offers (BF-100); "other" is stored but not browsable. */
export const EVENT_CITIES = [...CITIES, "other"] as const;
export type EventCity = (typeof EVENT_CITIES)[number];

export function isEventCity(value: unknown): value is EventCity {
  return typeof value === "string" && (EVENT_CITIES as readonly string[]).includes(value);
}

/** The city label in the reader's language, or "" when the event has none. */
export function cityLabel(t: (key: MessageKey) => string, value?: string | null): string {
  return isEventCity(value) ? t(`cities.${value}` as MessageKey) : "";
}

/** The preference key for the picked city (the website keeps it in a cookie). */
export const CITY_PREF = "biletflow.city";
