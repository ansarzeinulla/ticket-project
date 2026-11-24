import type { Metadata } from "next";

import { AdminSettings } from "@/components/admin-settings";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("adminTools.settingsTitle") };
}

export default function AdminSettingsPage() {
  return <AdminSettings />;
}
