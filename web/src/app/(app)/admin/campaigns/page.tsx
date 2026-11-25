import type { Metadata } from "next";

import { AdminCampaigns } from "@/components/admin-campaigns";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("adminTools.campaignsTitle") };
}

export default function AdminCampaignsPage() {
  return <AdminCampaigns />;
}
