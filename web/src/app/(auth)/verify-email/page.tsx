import { Suspense } from "react";
import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { VerifyEmailView } from "./verify-email-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("auth.verify.title") };
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-foreground-muted">…</p>}>
      <VerifyEmailView />
    </Suspense>
  );
}
