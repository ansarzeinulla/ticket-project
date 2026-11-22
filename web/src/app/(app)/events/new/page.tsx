import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { CreateEventForm } from "./create-event-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("org.titles.newEvent") };
}

export default function NewEventPage() {
  return <CreateEventForm />;
}
