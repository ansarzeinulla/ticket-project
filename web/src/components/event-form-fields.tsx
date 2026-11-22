"use client";

import { ImageUpload } from "@/components/image-upload";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { slugify } from "@/lib/datetime";
import { useT } from "@/lib/i18n/context";
import type { Translator } from "@/lib/i18n/translate";

export const VISIBILITIES = ["public", "unlisted", "private"] as const;

/**
 * The editable shape of an event, as the two forms hold it in state.
 *
 * Everything is a string because that is what an <input> gives back; the
 * conversion to ISO instants, numbers and nulls happens once, at submit, in
 * whichever form owns it.
 */
export interface EventFormValues {
  title: string;
  slug: string;
  capacity: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  description: string;
  coverImageURL: string;
  refundPolicy: string;
  category: string;
  venueName: string;
  venueAddress: string;
  visibility: string;
}

/**
 * The fields shared by creating and editing an event (SRS 4.2).
 *
 * Extracted rather than duplicated: an edit form that drifts from the create
 * form is how a field ends up settable at creation and un-editable afterwards,
 * which is exactly the gap SRS 4.2 ("Create, edit, ... events") was left with.
 *
 * The slug is deliberately not offered when editing a published event: the
 * event URL is on printed tickets and in campaign QR codes by then, so
 * changing it would break links that are already in people's hands.
 */
export function EventFormFields({
  values,
  onChange,
  fieldErrors,
  disabled,
  zones,
  slugLocked,
  optionalOpen = false,
}: {
  values: EventFormValues;
  onChange: <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => void;
  fieldErrors: Record<string, string>;
  disabled: boolean;
  zones: string[];
  /** True once the URL is in circulation and must not move. */
  slugLocked?: boolean;
  optionalOpen?: boolean;
}) {
  const t = useT();
  const slugPreview = values.slug.trim()
    ? slugify(values.slug)
    : slugify(values.title) || "your-event";

  return (
    <>
      <TextField
        label={t("org.form.title")}
        name="title"
        placeholder="Almaty Winter Jazz Night"
        required
        value={values.title}
        error={fieldErrors.title}
        disabled={disabled}
        onChange={(event) => onChange("title", event.target.value)}
      />

      {slugLocked ? (
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-foreground">{t("org.form.slug")}</span>
          <p className="rounded-lg border border-border-subtle bg-surface-muted px-3 py-2.5 font-mono text-sm text-foreground-muted">
            /{values.slug}
          </p>
          <p className="text-xs text-foreground-muted">
            {t("org.form.slugLocked")}
          </p>
        </div>
      ) : (
        <TextField
          label={t("org.form.slug")}
          name="slug"
          placeholder={t("org.form.slugPlaceholder")}
          hint={
            <>
              {t("org.form.slugPreview")} <span className="font-mono">/{slugPreview}</span>
            </>
          }
          value={values.slug}
          error={fieldErrors.slug}
          disabled={disabled}
          onChange={(event) => onChange("slug", event.target.value)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("org.form.startsAt")}
          type="datetime-local"
          name="starts_at"
          required
          value={values.startsAt}
          error={fieldErrors.starts_at}
          disabled={disabled}
          onChange={(event) => onChange("startsAt", event.target.value)}
        />
        <TextField
          label={t("org.form.endsAt")}
          type="datetime-local"
          name="ends_at"
          required
          value={values.endsAt}
          error={fieldErrors.ends_at}
          disabled={disabled}
          onChange={(event) => onChange("endsAt", event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("org.eventCard.capacity")}
          type="number"
          name="capacity"
          min={1}
          step={1}
          placeholder="200"
          hint={t("org.form.capacityHint")}
          value={values.capacity}
          error={fieldErrors.capacity}
          disabled={disabled}
          onChange={(event) => onChange("capacity", event.target.value)}
        />
        <SelectField
          label={t("org.eventCard.timezone")}
          name="timezone"
          required
          options={zones}
          value={values.timezone}
          error={fieldErrors.timezone}
          disabled={disabled}
          hint={t("org.form.timezoneHint")}
          onChange={(event) => onChange("timezone", event.target.value)}
        />
      </div>

      <details
        open={optionalOpen}
        className="rounded-lg border border-border-subtle bg-surface-muted/40 p-4"
      >
        <summary className="cursor-pointer text-sm font-medium">{t("org.form.optional")}</summary>

        <div className="mt-4 space-y-4">
          <ImageUpload
            value={values.coverImageURL}
            onChange={(url) => onChange("coverImageURL", url)}
            disabled={disabled}
          />

          <TextAreaField
            label={t("org.form.refundPolicy")}
            name="refund_policy"
            placeholder={t("org.form.refundPlaceholder")}
            hint={t("org.form.refundHint")}
            value={values.refundPolicy}
            error={fieldErrors.refund_policy}
            disabled={disabled}
            onChange={(value) => onChange("refundPolicy", value)}
          />

          <TextAreaField
            label={t("org.form.description")}
            name="description"
            placeholder={t("org.form.descriptionPlaceholder")}
            value={values.description}
            error={fieldErrors.description}
            disabled={disabled}
            onChange={(value) => onChange("description", value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("org.form.category")}
              name="category"
              placeholder="music"
              value={values.category}
              error={fieldErrors.category}
              disabled={disabled}
              onChange={(event) => onChange("category", event.target.value)}
            />
            <SelectField
              label={t("org.form.visibility")}
              name="visibility"
              options={VISIBILITIES}
              optionLabel={(option) => t(`org.form.visibilities.${option as (typeof VISIBILITIES)[number]}`)}
              value={values.visibility}
              error={fieldErrors.visibility}
              disabled={disabled}
              onChange={(event) => onChange("visibility", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("org.form.venueName")}
              name="venue_name"
              placeholder="Almaty Demo Hall"
              value={values.venueName}
              error={fieldErrors.venue_name}
              disabled={disabled}
              onChange={(event) => onChange("venueName", event.target.value)}
            />
            <TextField
              label={t("org.form.venueAddress")}
              name="venue_address"
              placeholder="Abay Avenue 44, Almaty"
              value={values.venueAddress}
              error={fieldErrors.venue_address}
              disabled={disabled}
              onChange={(event) => onChange("venueAddress", event.target.value)}
            />
          </div>
        </div>
      </details>
    </>
  );
}

/**
 * The validation both forms share.
 *
 * Returns field-keyed messages using the API's own field names, so a
 * client-side error and a server 422 land on the same input.
 */
export function validateEventForm(
  values: EventFormValues,
  toISO: (local: string, zone: string) => string | null,
  t: Translator,
): { errors: Record<string, string>; startsISO: string | null; endsISO: string | null } {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = t("org.form.errTitle");

  // The organizer types wall-clock time at the venue; convert it to a real
  // instant using the event's own timezone, not the browser's.
  const startsISO = toISO(values.startsAt, values.timezone);
  const endsISO = toISO(values.endsAt, values.timezone);

  if (!startsISO) errors.starts_at = t("org.form.errStarts");
  if (!endsISO) errors.ends_at = t("org.form.errEnds");
  if (startsISO && endsISO && new Date(endsISO) <= new Date(startsISO)) {
    errors.ends_at = t("org.form.errOrder");
  }

  const capacity = values.capacity.trim();
  if (capacity !== "") {
    const parsed = Number(capacity);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.capacity = t("org.form.errCapacity");
    }
  }

  return { errors, startsISO, endsISO };
}
