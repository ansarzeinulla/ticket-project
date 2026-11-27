"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES, CITIES, CITY_COOKIE, isCity, type City } from "@/lib/catalogue";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useT } from "@/lib/i18n/context";

function readCity(): City | "" {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CITY_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : "";
  return isCity(value) ? value : "";
}

/**
 * The BiletFlow mark: a ticket stub - notched on both sides, a perforation
 * line near the end - carrying the letters BF.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size * (44 / 30)} height={size} viewBox="0 0 44 30" aria-hidden className="shrink-0">
      <path
        d="M3 0h38a3 3 0 0 1 3 3v8a4 4 0 0 0 0 8v8a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3v-8a4 4 0 0 0 0-8V3a3 3 0 0 1 3-3z"
        fill="var(--brand)"
      />
      <path d="M33 4v22" stroke="#fff" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.7" />
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="700"
        fontSize="13"
        fill="#fff"
        letterSpacing="-0.5"
      >
        BF
      </text>
      <circle cx="38.5" cy="15" r="2.2" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`text-lg font-bold tracking-tight ${light ? "text-white" : ""}`}>BiletFlow</span>
    </span>
  );
}

/** The category strip; reads the query string, so it renders inside <Suspense>. */
function CategoryStrip() {
  const t = useT();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();
  const current = pathname === "/events" ? (params.get("category") ?? "all") : null;

  const link = (key: string, href: string, label: string, active: boolean) => (
    <Link
      key={key}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative shrink-0 whitespace-nowrap py-3 text-sm transition-colors ${
        active
          ? "font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand"
          : "text-foreground-muted hover:text-foreground"
      }`}
      data-testid={`nav-${key}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6">
      <nav className="scroll-row flex min-w-0 flex-1 items-center gap-6 overflow-x-auto" aria-label={t("nav.main")}>
        {link("all", "/events", t("home.allCategories"), current === "all")}
        {CATEGORIES.map((category) =>
          link(category, `/events?category=${category}`, t(`categories.${category}`), current === category),
        )}
      </nav>
      <nav className="hidden shrink-0 items-center gap-6 md:flex" aria-label={t("home.forOrganizers")}>
        {link("my-events", "/dashboard", user ? t("home.myEvents") : t("home.forOrganizers"), pathname?.startsWith("/dashboard") ?? false)}
        {user && link("create-event", "/events/new", t("nav.createEvent"), pathname === "/events/new")}
      </nav>
    </div>
  );
}

/** The signed-in account's menu: the account's own pages and sign-out. */
function AccountMenu() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  if (!user) return null;
  // My tickets, My events and Create event are in the header on wider screens,
  // so the menu lists them only where the header has no room (BF-100).
  const links: { href: string; label: MessageKey; narrowOnly?: boolean }[] = [
    { href: "/orders", label: "nav.myTickets", narrowOnly: true },
    { href: "/dashboard", label: "home.myEvents", narrowOnly: true },
    { href: "/events/new", label: "nav.createEvent", narrowOnly: true },
    { href: "/dashboard/profile", label: "org.titles.profile" },
    ...(user.roles.includes("platform_admin") ? [{ href: "/admin", label: "nav.administration" as MessageKey }] : []),
  ];

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-white hover:bg-white/10"
        data-testid="account-menu"
      >
        <span className="grid h-6 w-6 place-items-center rounded bg-brand text-xs font-bold text-white" aria-hidden>
          {user.full_name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-36 truncate sm:inline" data-testid="profile-link">
          {user.full_name}
        </span>
        <span aria-hidden className="text-top-muted">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg border border-border-subtle bg-surface text-foreground shadow-lg"
        >
          <div className="border-b border-border-subtle px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.full_name}</p>
            <p className="truncate text-xs text-foreground-muted">{user.email}</p>
          </div>
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                className={`block border-l-2 px-4 py-2.5 text-sm hover:bg-surface-muted ${
                  active ? "border-brand font-semibold text-brand" : "border-transparent"
                } ${link.narrowOnly ? "md:hidden" : ""}`}
              >
                {t(link.label)}
              </Link>
            );
          })}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout();
              router.replace("/");
              router.refresh();
            }}
            className="block w-full border-t border-border-subtle px-4 py-2.5 text-left text-sm text-danger hover:bg-surface-muted"
          >
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The one header every page shares (BF-100): logo, search, city, language and
 * the account on top; the category strip below. Browsing never needs an
 * account - "Sign in" is just a button here.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useAuth();
  const t = useT();
  const [city, setCity] = useState<City | "">("");

  // The cookie is the source of truth; it is read once the page is in the browser.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCity(readCity()), []);

  function chooseCity(next: City | "") {
    setCity(next);
    document.cookie = next
      ? `${CITY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      : `${CITY_COOKIE}=; path=/; max-age=0`;
    router.refresh();
  }

  const loginHref =
    pathname && pathname !== "/" && pathname !== "/login" ? `/login?next=${encodeURIComponent(pathname)}` : "/login";

  return (
    <header className="sticky top-0 z-40">
      {/* Keyboard users skip the header's 16 stops straight to the page (WCAG 2.4.1). */}
      <a
        href="#content"
        className="sr-only rounded-md bg-surface px-4 py-2 text-sm font-semibold text-foreground ring-2 ring-brand focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        {t("home.skipToContent")}
      </a>
      <div className="bg-top text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="BiletFlow" data-testid="home-link">
            <Logo light />
          </Link>

          <form action="/events" role="search" className="order-last w-full md:order-none md:w-auto md:max-w-xl md:flex-1">
            <label className="block">
              <span className="sr-only">{t("home.searchLabel")}</span>
              <input
                type="search"
                name="q"
                placeholder={t("home.searchPlaceholder")}
                className="w-full rounded-md border-0 bg-white px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:ring-2 focus:ring-brand"
                data-testid="header-search"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-4">
            <label className="text-sm">
              <span className="sr-only">{t("home.city")}</span>
              <select
                value={city}
                onChange={(event) => chooseCity(event.target.value as City | "")}
                className="cursor-pointer bg-transparent py-1.5 text-sm font-medium text-white outline-none [&>option]:text-foreground"
                data-testid="city-picker"
              >
                <option value="">{t("home.allCities")}</option>
                {CITIES.map((option) => (
                  <option key={option} value={option}>
                    {t(`cities.${option}`)}
                  </option>
                ))}
              </select>
            </label>

            <LanguageSwitcher dark />

            {user && (
              <Link href="/orders" className="hidden text-sm font-medium text-white hover:text-brand-soft md:block" data-testid="header-my-tickets">
                {t("nav.myTickets")}
              </Link>
            )}

            {status === "loading" ? (
              <span className="h-9 w-20" aria-hidden />
            ) : user ? (
              <AccountMenu />
            ) : (
              <Link
                href={loginHref}
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
                data-testid="header-sign-in"
              >
                {t("home.signIn")}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-border-subtle bg-surface">
        <Suspense fallback={<div className="h-11" />}>
          <CategoryStrip />
        </Suspense>
      </div>
    </header>
  );
}
