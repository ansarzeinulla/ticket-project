"use client";

import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import type { EventStatus, Lifecycle } from "@/lib/types";

const styles: Record<EventStatus, string> = {
  draft: "bg-surface-muted text-foreground-muted",
  published: "bg-success-soft text-success",
  unpublished: "bg-warning-soft text-warning",
  cancelled: "bg-danger-soft text-danger",
  completed: "bg-brand-soft text-brand-strong",
  suspended: "bg-danger-soft text-danger",
};

const labels: Record<EventStatus, MessageKey> = {
  draft: "org.status.draft",
  published: "org.status.published",
  unpublished: "org.status.unpublished",
  cancelled: "org.status.cancelled",
  completed: "org.status.completed",
  suspended: "org.status.suspended",
};

/** Where an event is in its life, for the small grey pill next to the status. */
export const LIFECYCLE_LABELS: Record<Lifecycle, MessageKey> = {
  draft: "org.lifecycle.draft",
  upcoming: "org.lifecycle.upcoming",
  active: "org.lifecycle.active",
  completed: "org.lifecycle.completed",
  cancelled: "org.lifecycle.cancelled",
  suspended: "org.lifecycle.suspended",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const t = useT();
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {t(labels[status])}
    </span>
  );
}
