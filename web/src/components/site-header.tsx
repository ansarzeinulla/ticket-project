"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/context";

const links = [
  { href: "/dashboard", label: "nav.events" },
  { href: "/events/new", label: "nav.createEvent" },
  // SRS 4.9: an attendee reaches their own orders from their account, not only
  // from the emailed link. Every signed-in user is an attendee of something.
  { href: "/orders", label: "nav.myTickets" },
] as const satisfies readonly { href: string; label: MessageKey }[];

/** Shown only to platform administrators (SRS 2.1). */
const adminLink = { href: "/admin", label: "nav.administration" } as const satisfies { href: string; label: MessageKey };

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const t = useT();

  function handleSignOut() {
    logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border-subtle bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
            B
          </span>
          <span className="hidden font-semibold tracking-tight sm:inline">BiletFlow</span>
        </Link>

        {/* The nav scrolls sideways on a phone instead of pushing the page wider:
            with the admin link, or in Kazakh and Russian, it does not fit 375 px. */}
        <nav
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          aria-label={t("nav.main")}
        >
          {[...links, ...(user?.roles.includes("platform_admin") ? [adminLink] : [])].map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-strong"
                    : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
                }`}
              >
                {t(link.label)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {user && (
            // The name is the link to the profile: it is where somebody looks
            // for "my account" without being told to.
            <Link
              href="/dashboard/profile"
              className="hidden rounded-lg px-2 py-1 text-right hover:bg-surface-muted sm:block"
              data-testid="profile-link"
            >
              <span className="block text-sm font-medium leading-tight">{user.full_name}</span>
              <span className="block text-xs text-foreground-muted">{user.email}</span>
            </Link>
          )}
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            {t("nav.signOut")}
          </Button>
        </div>
      </div>
    </header>
  );
}
