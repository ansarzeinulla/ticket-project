import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { AdminPortal } from "./admin-portal";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("org.titles.admin") };
}

export default function AdminPage() {
  return <AdminPortal />;
}
