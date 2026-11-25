import type { ReactNode } from "react";

import { api } from "@/lib/api";
import { getTranslations } from "@/lib/i18n/server";
import { mediaURL } from "@/lib/media";

/**
 * Sign in, register and the password pages (BF-100): the form on the right,
 * a wall of what is on sale on the left, so the page still feels like the
 * storefront the visitor came from.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getTranslations();
  const posters = await api
    .listPublicEvents({ limit: 12, startsAfter: new Date().toISOString() })
    .then((data) => data.events.map((event) => mediaURL(event.cover_image_url)).filter((url): url is string => !!url).slice(0, 6))
    .catch(() => [] as string[]);

  return (
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-xl bg-surface ring-1 ring-border-subtle md:grid-cols-2">
        <div className="relative hidden bg-top md:block" aria-hidden>
          <div className="grid h-full grid-cols-3 gap-2 p-2 opacity-60">
            {posters.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-full min-h-40 w-full rounded object-cover" />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-black/70 p-8 text-white">
            <p className="text-2xl font-bold leading-snug">{t("home.footerTagline")}</p>
          </div>
        </div>
        <div className="p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
