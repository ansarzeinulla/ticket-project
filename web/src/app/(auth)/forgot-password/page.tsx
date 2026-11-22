import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("auth.forgot.title") };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
