"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Spinner } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/context";

/**
 * The signed-in shell.
 *
 * proxy.ts already turned away requests with no token cookie. This second gate
 * covers the case the proxy cannot see: a cookie that exists but the API has
 * rejected, which AuthProvider discovers on its /auth/me call.
 *
 * The organizer and admin pages get a workspace sidebar (BF-100); an
 * attendee's own pages (My tickets) do not.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <Spinner />
          {status === "loading" ? t("org.shell.checking") : t("org.shell.redirecting")}
        </div>
      </div>
    );
  }

  const workspace = pathname.startsWith("/dashboard") || pathname.startsWith("/events/new") || pathname.startsWith("/admin");
  if (!workspace) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</main>;
  }

  const isAdmin = user?.roles.includes("platform_admin") ?? false;
  const groups: { title: MessageKey; links: { href: string; label: MessageKey; exact?: boolean }[] }[] = [
    {
      title: "home.forOrganizers",
      links: [
        { href: "/dashboard", label: "home.myEvents", exact: true },
        { href: "/events/new", label: "nav.createEvent" },
        { href: "/dashboard/support", label: "platformSupport.link" },
        { href: "/dashboard/profile", label: "org.titles.profile" },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: "nav.administration" as MessageKey,
            links: [
              { href: "/admin", label: "org.titles.admin" as MessageKey, exact: true },
              { href: "/admin/reports", label: "org.titles.reports" as MessageKey },
              { href: "/admin/support", label: "platformInbox.link" as MessageKey },
              { href: "/admin/campaigns", label: "adminTools.campaignsLink" as MessageKey },
              { href: "/admin/settings", label: "adminTools.settingsLink" as MessageKey },
            ],
          },
        ]
      : []),
  ];
  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href || (href === "/dashboard" && pathname.startsWith("/dashboard/events")) : pathname.startsWith(href);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <nav className="scroll-row flex gap-1 overflow-x-auto rounded-lg bg-surface p-2 ring-1 ring-border-subtle lg:block lg:space-y-4" aria-label={t("home.forOrganizers")}>
          {groups.map((group) => (
            <div key={group.title} className="flex shrink-0 gap-1 lg:block lg:space-y-0.5">
              <p className="hidden px-3 pb-1 pt-2 text-xs font-semibold text-foreground-muted lg:block">{t(group.title)}</p>
              {group.links.map((link) => {
                const on = active(link.href, link.exact);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={on ? "page" : undefined}
                    className={`block shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                      on ? "bg-brand-soft font-semibold text-brand-strong" : "hover:bg-surface-muted"
                    }`}
                  >
                    {t(link.label)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
