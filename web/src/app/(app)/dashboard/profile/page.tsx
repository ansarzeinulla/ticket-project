import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { ProfileForm } from "./profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("org.titles.profile") };
}

/** The organizer's profile and account settings (SRS 4.1). */
export default function ProfilePage() {
  return <ProfileForm />;
}
