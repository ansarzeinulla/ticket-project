import { Suspense } from "react";
import type { Metadata } from "next";

import { getTranslations } from "@/lib/i18n/server";

import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t("auth.login.title") };
}

export default function LoginPage() {
  return (
    // useSearchParams inside the form needs a Suspense boundary, otherwise the
    // whole route falls back to client-side rendering.
    <Suspense fallback={<p className="text-sm text-foreground-muted">…</p>}>
      <LoginForm />
    </Suspense>
  );
}
