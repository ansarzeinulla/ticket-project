import { isoToLocalInput, localInputToISO } from "./datetime";

/**
 * Dates are typed as "YYYY-MM-DD HH:MM" in the event's own timezone - a
 * phone has no universal date-time picker, and the website reads the same
 * wall-clock form.
 */
export const DATE_INPUT_HINT = "YYYY-MM-DD HH:MM";

export function inputToISO(value: string, timeZone: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return localInputToISO(trimmed.replace(" ", "T"), timeZone);
}

export function isoToInput(iso: string | undefined | null, timeZone: string): string {
  return iso ? isoToLocalInput(iso, timeZone).replace("T", " ") : "";
}
