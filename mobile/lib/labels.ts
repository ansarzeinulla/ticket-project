import type { MessageKey } from "./i18n/dictionaries";
import type { Translator } from "./i18n/translate";

/**
 * Status and role names in the reader's language, using the website's own
 * catalogue keys. Unknown values fall back to the raw name.
 */
function pick(t: Translator, prefix: string, value: string, known: readonly string[]): string {
  return known.includes(value) ? t(`${prefix}.${value}` as MessageKey) : value.replace(/_/g, " ");
}

export const eventStatusLabel = (t: Translator, value: string) =>
  pick(t, "org.status", value, ["draft", "published", "unpublished", "cancelled", "completed", "suspended"]);

export const lifecycleLabel = (t: Translator, value: string) =>
  pick(t, "org.lifecycle", value, ["draft", "upcoming", "active", "completed", "cancelled", "suspended"]);

export const eventOrderStatusLabel = (t: Translator, value: string) =>
  pick(t, "org.orders.status", value, ["paid", "completed", "refunded", "partially_refunded", "cancelled", "pending"]);

export const campaignStatusLabel = (t: Translator, value: string) =>
  pick(t, "org.campaigns.status", value, ["active", "disabled", "exhausted", "expired", "draft"]);

export const payoutStatusLabel = (t: Translator, value: string) =>
  pick(t, "org.profile.payoutStatus", value, ["unverified", "pending_review", "verified", "rejected"]);

export const reportStatusLabel = (t: Translator, value: string) =>
  pick(t, "org.reports.status", value, ["open", "reviewing", "upheld", "dismissed"]);

export const reportReasonLabel = (t: Translator, value: string) =>
  pick(t, "org.reports.reasons", value, ["fraud", "misleading", "inappropriate", "spam", "copyright", "other"]);

export const adminWordLabel = (t: Translator, value: string) =>
  pick(t, "org.words", value, [
    "pending_verification", "active", "suspended", "deactivated", "draft", "published", "unpublished",
    "cancelled", "completed", "upcoming", "pending", "awaiting_payment", "paid", "refunded",
    "partially_refunded", "expired", "failed", "succeeded", "not_started", "in_progress", "ticket_order",
    "paid_sales_activation", "attendee", "organizer", "event_admin", "support_staff", "platform_admin",
  ]);

const ATTENDEE_STATUS: Record<string, MessageKey> = {
  valid: "org.attendees.statusValid",
  checked_in: "org.attendees.statusCheckedIn",
  cancelled: "org.attendees.statusCancelled",
  refunded: "org.attendees.statusRefunded",
};
export const attendeeStatusLabel = (t: Translator, value: string) =>
  ATTENDEE_STATUS[value] ? t(ATTENDEE_STATUS[value]) : value;

const STAFF_ROLE: Record<string, MessageKey> = {
  event_admin: "org.staff.roleEventAdmin",
  support_staff: "org.staff.roleSupport",
  manager: "org.staff.roleManager",
};
export const staffRoleLabel = (t: Translator, value: string) => (STAFF_ROLE[value] ? t(STAFF_ROLE[value]) : value);

const TIMELINE_ACTIONS = [
  "event.created", "event.updated", "event.published", "event.unpublished", "event.cancelled",
  "event.suspended", "event.unsuspended", "event.deleted", "event.duplicated", "event.duplicated_from",
  "ticket_type.created", "ticket_type.updated", "ticket_type.deleted", "order.created",
  "ticket.checked_in", "ticket.check_in_reversed", "campaign.created", "campaign.active",
  "campaign.disabled", "campaign.deleted", "staff.assigned", "staff.revoked", "support_case.opened",
  "support_case.resolved", "support_case.in_progress", "support_case.waiting_for_customer",
  "support_case.open", "paid_sales.activated", "event.activation_updated", "event.paid_sales_activated",
  "event.paid_sales_suspended", "event.paid_sales_unsuspended", "event.report_reviewed", "order.cancelled",
  "order.confirmation", "order.refunded", "refund.completed", "support_case.assigned",
  "support_case.unassigned",
];
export function timelineActionLabel(t: Translator, action: string): string {
  return TIMELINE_ACTIONS.includes(action)
    ? t(`org.timeline.actions.${action.replace(/\./g, "__")}` as MessageKey)
    : action.replace(/[._]/g, " ");
}
