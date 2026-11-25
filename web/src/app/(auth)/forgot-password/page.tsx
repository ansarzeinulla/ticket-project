import type { Metadata } from "next";
import { Suspense } from "react";

import { getTranslations } from "@/lib/i18n/server";

import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("auth.forgot.title") };
}

export default function ForgotPasswordPage() {
  return (
    // The reset form shown after sending reads ?email=, which needs a boundary.
    <Suspense fallback={<p className="text-sm text-foreground-muted">…</p>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
