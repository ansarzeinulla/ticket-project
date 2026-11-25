import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTranslations } from "@/lib/i18n/server";

export const LEGAL_PAGES = ["terms", "privacy", "refunds", "cookies", "about", "contacts"] as const;
type LegalPage = (typeof LEGAL_PAGES)[number];

export const metadata: Metadata = { title: "BiletFlow" };

/** The footer's legal pages - all of them the same joke (BF-100). */
export default async function LegalPageView({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!(LEGAL_PAGES as readonly string[]).includes(page)) notFound();
  const { t } = await getTranslations();

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold text-brand">{t(`legal.${page as LegalPage}`)}</p>
      <h1 className="mt-3 text-4xl font-bold">{t("legal.gotYou")}</h1>
      <p className="mt-5 text-lg leading-relaxed text-foreground-muted" data-testid="legal-body">
        {t("legal.body")}
      </p>
      <Link href="/events" className="mt-8 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong">
        {t("legal.back")}
      </Link>
    </main>
  );
}
