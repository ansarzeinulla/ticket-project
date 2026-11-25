import type { Metadata } from "next";
import { Geist_Mono, Golos_Text } from "next/font/google";
import type { ReactNode } from "react";

import { AnalyticsScripts } from "@/components/analytics-scripts";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { AuthProvider } from "@/lib/auth-context";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/context";
import "./globals.css";

// Golos Text carries the Cyrillic extension Kazakh needs (ә ғ қ ң ө ұ ү һ і);
// without it every Kazakh string would silently fall back to a system font.
const bodyFont = Golos_Text({
  variable: "--font-body",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "BiletFlow — concerts, theatre and events in Kazakhstan",
    template: "%s · BiletFlow",
  },
  description: "Discover events and buy tickets on BiletFlow.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The locale is resolved once, on the server, and drives both <html lang>
  // and the client-side translator (SRS §685).
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* The provider owns the session, so every route can read the user. */}
        <I18nProvider locale={locale}>
          <AuthProvider>
            {/* One header and footer for every page (BF-100). */}
            <SiteHeader />
            <VerifyEmailBanner />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </AuthProvider>
        </I18nProvider>
        {/* Renders nothing unless a measurement id is configured. */}
        <AnalyticsScripts />
      </body>
    </html>
  );
}
