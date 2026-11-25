import Link from "next/link";

import { getTranslations } from "@/lib/i18n/server";

/** Any address that leads nowhere: a plain way back, no error codes (BF-100). */
export default async function NotFound() {
  const { t } = await getTranslations();
  return (
    <div className="grid min-h-[50vh] place-items-center px-4 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">{t("notFound.heading")}</h1>
        <p className="mt-3 text-foreground-muted">{t("notFound.body")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          {t("notFound.back")}
        </Link>
      </div>
    </div>
  );
}
