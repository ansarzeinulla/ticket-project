import { API_BASE_URL } from "./config";

/** The API's origin as this device reaches it, e.g. http://192.168.1.24:8080. */
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, "");

/**
 * The URL of an event image on this device (BF-100).
 *
 * Seeded posters are stored as API-relative paths (/media/x.jpg). Uploaded
 * banners are absolute and carry the API's own idea of its address, which is
 * "localhost" in development - unreachable from a phone - so a localhost
 * address is rewritten to the host this device actually uses.
 */
export function mediaURL(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/")) return `${API_ORIGIN}${url}`;
  const local = url.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)$/);
  return local ? `${API_ORIGIN}${local[1]}` : url;
}
