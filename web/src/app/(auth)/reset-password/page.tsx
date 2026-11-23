import { Suspense } from "react";
import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { ResetPasswordForm } from "./reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("auth.reset.title") };
}

export default function ResetPasswordPage() {
  return (
    // The token arrives as ?token=, and useSearchParams needs a boundary.
    <Suspense fallback={<p className="text-sm text-foreground-muted">…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
