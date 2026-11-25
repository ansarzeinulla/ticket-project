import type { MessageKey } from "./i18n/dictionaries";
import type { Translator } from "./i18n/translate";

const ORDER_STATUS_KEYS: Record<string, MessageKey> = {
  pending: "orderStatus.pending",
  awaiting_payment: "orderStatus.awaiting_payment",
  paid: "orderStatus.paid",
  completed: "orderStatus.completed",
  cancelled: "orderStatus.cancelled",
  refunded: "orderStatus.refunded",
  partially_refunded: "orderStatus.partially_refunded",
  expired: "orderStatus.expired",
  failed: "orderStatus.failed",
};

/** An order status in the visitor's language; unknown values fall back to the raw name. */
export function orderStatusLabel(t: Translator, status: string): string {
  const key = ORDER_STATUS_KEYS[status];
  return key ? t(key) : status.replace(/_/g, " ");
}
