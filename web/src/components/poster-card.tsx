import Link from "next/link";
import type { ReactNode } from "react";

import { formatInTimezone } from "@/lib/datetime";
import { mediaURL } from "@/lib/media";
import type { BiletEvent } from "@/lib/types";

/** The plain block shown where an event has no poster. */
export function PosterPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-end bg-brand-soft p-3" aria-hidden>
      <span className="text-sm font-semibold text-brand-strong">{label}</span>
    </div>
  );
}

/**
 * A portrait poster card - the storefront's basic unit (BF-100). A server
 * component: the caller passes the already-translated labels.
 */
export function PosterCard({
  event,
  categoryLabel,
  showCategory = true,
  locale,
  className = "",
}: {
  event: BiletEvent;
  categoryLabel: string;
  showCategory?: boolean;
  locale?: string;
  className?: string;
}) {
  const image = mediaURL(event.cover_image_url);
  return (
    <Link href={`/events/${event.slug}`} className={`group block ${className}`} data-testid={`poster-${event.slug}`}>
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-surface-muted ring-1 ring-black/5 transition group-hover:shadow-lg">
        {image ? (
          // A plain <img>: posters come from the Go API, not a next/image domain.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <PosterPlaceholder label={categoryLabel || event.title} />
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-brand">{formatInTimezone(event.starts_at, event.timezone, locale)}</p>
      <p className="mt-1 line-clamp-2 font-semibold leading-snug group-hover:text-brand">{event.title}</p>
      <p className="mt-0.5 line-clamp-1 text-sm text-foreground-muted">
        {showCategory && categoryLabel ? `${categoryLabel}, ${event.venue_name ?? ""}`.replace(/, $/, "") : event.venue_name}
      </p>
    </Link>
  );
}

/** A titled, horizontally scrolling row of posters with a "See all" link. */
export function PosterRow({
  title,
  seeAllHref,
  seeAllLabel,
  children,
  testID,
}: {
  title: string;
  seeAllHref?: string;
  seeAllLabel: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <section className="space-y-4" data-testid={testID}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="shrink-0 text-sm font-semibold text-brand hover:underline">
            {seeAllLabel}
          </Link>
        )}
      </div>
      <div className="scroll-row flex gap-5 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}
