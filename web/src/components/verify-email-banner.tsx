"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n/context";

/**
 * A one-line reminder under the header for an account whose email is not
 * confirmed (SRS 4.1). The code itself is entered on the profile page (BF-100),
 * so the reminder only points there - and is not repeated on that page.
 */
export function VerifyEmailBanner() {
  const t = useT();
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || user.email_verified_at || pathname === "/dashboard/profile") return null;

  return (
    <div className="border-b border-border-subtle bg-accent-soft" data-testid="verify-email-banner">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 px-4 py-2 text-sm sm:px-6">
        {t("home.verifyShort")}
        <Link href="/dashboard/profile#confirm-email" className="font-semibold text-brand-strong hover:underline" data-testid="verify-email-go">
          {t("home.verifyGo")}
        </Link>
      </p>
    </div>
  );
}
