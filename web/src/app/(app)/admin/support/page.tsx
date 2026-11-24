import type { Metadata } from "next";

import { PlatformInbox } from "@/components/platform-inbox";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("platformInbox.title") };
}

/** The platform admins' inbox of organizer requests (SRS 4.12, 4.13). */
export default function PlatformInboxPage() {
  return <PlatformInbox />;
}
