import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { ReportsQueue } from "./reports-queue";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("org.titles.reports") };
}

/** The platform moderation queue (SRS 4.12). */
export default function ReportsPage() {
  return <ReportsQueue />;
}
