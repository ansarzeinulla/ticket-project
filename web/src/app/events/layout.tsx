import type { ReactNode } from "react";

/**
 * The attendee-facing pages. No auth gate: browsing an event and buying a
 * ticket work without an account. The header and footer come from the root
 * layout, like every other page (BF-100).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
