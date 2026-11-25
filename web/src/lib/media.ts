import { PUBLIC_API_BASE_URL } from "@/lib/api";

/** The API's origin, e.g. http://localhost:8080 (the base URL without /api/v1). */
const API_ORIGIN = PUBLIC_API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

/**
 * The browser URL of an event image.
 *
 * The seeded catalogue stores posters as API-relative paths (/media/x.jpg);
 * uploads are stored as absolute URLs. Both work through this one function.
 */
export function mediaURL(url?: string | null): string | undefined {
  if (!url) return undefined;
  return url.startsWith("/") ? `${API_ORIGIN}${url}` : url;
}
