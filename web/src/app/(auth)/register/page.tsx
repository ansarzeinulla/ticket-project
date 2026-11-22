import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { RegisterForm } from "./register-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("auth.register.title") };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
