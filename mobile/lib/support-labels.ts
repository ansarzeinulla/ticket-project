import type { MessageKey } from "./i18n/dictionaries";
import type { Translator } from "./i18n/translate";
import type { SupportStatus } from "./models";

const CATEGORY_KEYS: Record<string, MessageKey> = {
  ticket_delivery: "support.category.ticket_delivery",
  payment: "support.category.payment",
  refund: "support.category.refund",
  seating: "support.category.seating",
  event_information: "support.category.event_information",
  check_in: "support.category.check_in",
  account: "support.category.account",
  technical: "support.category.technical",
};

/** The category in the visitor's language; unknown values fall back to the raw name. */
export function supportCategoryLabel(t: Translator, category: string): string {
  const key = CATEGORY_KEYS[category];
  return key ? t(key) : category.replace(/_/g, " ");
}

const STATUS_KEYS: Record<SupportStatus, MessageKey> = {
  open: "support.status.open",
  in_progress: "support.status.in_progress",
  waiting_for_customer: "support.status.waiting_for_customer",
  resolved: "support.status.resolved",
};

export function supportStatusLabel(t: Translator, status: SupportStatus): string {
  return t(STATUS_KEYS[status]);
}

/** Statuses an organizer can set, in the order they normally happen. */
export const ORGANIZER_STATUSES: SupportStatus[] = [
  "open",
  "in_progress",
  "waiting_for_customer",
  "resolved",
];

export const STATUS_STYLES: Record<SupportStatus, string> = {
  open: "bg-warning-soft text-warning",
  in_progress: "bg-brand-soft text-brand-strong",
  waiting_for_customer: "bg-surface-muted text-foreground-muted",
  resolved: "bg-success-soft text-success",
};

/** "14:32" for today, otherwise a short date and time. */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return new Intl.DateTimeFormat("en-GB", {
    ...(sameDay ? {} : { dateStyle: "medium" }),
    timeStyle: "short",
  }).format(date);
}
