import type { Metadata } from "next";

import { PlatformSupport } from "@/components/platform-support";
import { getTranslations } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("platformSupport.title") };
}

/** An organizer's requests to BiletFlow (SRS 4.13). */
export default function PlatformSupportPage() {
  return <PlatformSupport />;
}
