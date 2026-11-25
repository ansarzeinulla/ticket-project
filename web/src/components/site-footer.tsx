import Link from "next/link";

import { LogoMark } from "@/components/site-header";
import { CATEGORIES } from "@/lib/catalogue";
import { getTranslations } from "@/lib/i18n/server";

/** The footer every page shares, dark like the top bar (BF-100). */
export async function SiteFooter() {
  const { t } = await getTranslations();
  const column = (title: string, links: [string, string][]) => (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="mt-20 bg-top text-top-muted">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-3">
          <span className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="text-lg font-bold text-white">BiletFlow</span>
          </span>
          <p className="text-sm">{t("home.footerTagline")}</p>
        </div>
        {column(
          t("home.footerExplore"),
          CATEGORIES.slice(0, 5).map((category) => [`/events?category=${category}`, t(`categories.${category}`)]),
        )}
        {column(t("legal.company"), [
          ["/legal/about", t("legal.about")],
          ["/legal/contacts", t("legal.contacts")],
          ["/dashboard", t("home.forOrganizers")],
          ["/orders", t("nav.myTickets")],
        ])}
        {column(t("legal.help"), [
          ["/legal/terms", t("legal.terms")],
          ["/legal/privacy", t("legal.privacy")],
          ["/legal/refunds", t("legal.refunds")],
          ["/legal/cookies", t("legal.cookies")],
        ])}
      </div>
      <p
        className="mx-auto max-w-7xl border-t border-white/10 px-4 py-5 text-xs leading-relaxed sm:px-6"
        data-testid="student-project-note"
      >
        {t("home.footerNote")}
      </p>
    </footer>
  );
}
