"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface HeroSlide {
  href: string;
  image: string;
  title: string;
  kicker: string;
  when: string;
  where: string;
}

const ADVANCE_MS = 7000;
const TOUCH_RESUME_MS = 2500;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function scrollToSlide(track: HTMLElement | null, i: number, count: number) {
  if (!track || count === 0) return;
  const next = (i + count) % count;
  track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion() ? "auto" : "smooth" });
}

/**
 * The home page's featured events (BF-100): the poster blurred across the
 * whole banner under a plain dark shade, the sharp poster on the right and
 * the details in white. The slides sit in a native scroll-snap row so they
 * can be swiped on touch screens; the current slide follows the scroll
 * position. Advances every seven seconds unless a mouse is over it, the
 * visitor is touching it (resumes a few seconds after), or the visitor
 * prefers reduced motion.
 */
export function HeroCarousel({ slides, cta }: { slides: HeroSlide[]; cta: string }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [touched, setTouched] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const count = slides.length;
  const go = (i: number) => scrollToSlide(trackRef.current, i, count);

  useEffect(() => {
    if (hovered || touched || count < 2 || reducedMotion()) return;
    const timer = setTimeout(() => scrollToSlide(trackRef.current, index + 1, count), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, hovered, touched, count]);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  if (count === 0) return null;

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))));
  };
  const touchStart = () => {
    clearTimeout(resumeTimer.current);
    setTouched(true);
  };
  const touchEnd = () => {
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setTouched(false), TOUCH_RESUME_MS);
  };

  return (
    <section
      className="relative overflow-hidden rounded-xl bg-top"
      aria-roledescription="carousel"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onTouchStart={touchStart}
      onTouchEnd={touchEnd}
      onTouchCancel={touchEnd}
      data-testid="hero"
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="scroll-row flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        {slides.map((slide, i) => (
          <Link
            key={slide.href}
            href={slide.href}
            className="relative block h-80 w-full shrink-0 snap-start snap-always overflow-hidden sm:h-96"
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative flex h-full items-center justify-between gap-8 px-6 pb-6 pt-4 sm:px-14">
              <div className="min-w-0 max-w-xl space-y-4 text-white">
                <span className="inline-block max-w-full truncate rounded bg-brand px-2.5 py-1 text-xs font-semibold">{slide.kicker}</span>
                <h2 className="line-clamp-2 break-words text-3xl font-bold leading-tight sm:text-5xl">{slide.title}</h2>
                <p className="text-sm text-white/85 sm:text-base">
                  <span className="block truncate">{slide.when}</span>
                  {slide.where ? <span className="block truncate text-white/70">{slide.where}</span> : null}
                </p>
                <span className="inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white">{cta}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.image} alt="" className="hidden h-[85%] shrink-0 rounded-lg object-cover shadow-2xl sm:block" />
            </div>
          </Link>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-md bg-white/15 text-xl text-white hover:bg-white/30 sm:grid"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-md bg-white/15 text-xl text-white hover:bg-white/30 sm:grid"
            aria-label="Next"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.href}
                type="button"
                onClick={() => go(i)}
                aria-label={`${i + 1}`}
                aria-current={i === index}
                className={`h-1 rounded-sm transition-all ${i === index ? "w-8 bg-white" : "w-4 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
