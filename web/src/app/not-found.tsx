import Link from "next/link";

import { getTranslations } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getTranslations();
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-foreground-muted">404</p>
        <h1 className="mt-2 text-lg font-semibold">{t("notFound.heading")}</h1>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          {t("notFound.back")}
        </Link>
      </div>
    </div>
  );
}
