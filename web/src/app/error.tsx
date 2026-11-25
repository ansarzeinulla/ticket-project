"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md rounded-lg bg-surface p-8 text-center ring-1 ring-border-subtle">
        <h1 className="text-2xl font-bold">{t("appError.heading")}</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {error.message || t("appError.fallback")}
        </p>
        <Button className="mt-6" onClick={reset}>
          {t("appError.retry")}
        </Button>
      </div>
    </div>
  );
}
