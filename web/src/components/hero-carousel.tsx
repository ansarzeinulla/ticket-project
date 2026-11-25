"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface HeroSlide {
  href: string;
  image: string;
  title: string;
  kicker: string;
  when: string;
  where: string;
}

/**
 * The home page's featured events (BF-100): the poster blurred across the
 * whole banner under a plain dark shade, the sharp poster on the right and
 * the details in white. Advances every seven seconds unless the pointer is
 * over it or the visitor prefers reduced motion.
 */
export function HeroCarousel({ slides, cta }: { slides: HeroSlide[]; cta: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;
  const go = (i: number) => setIndex((i + slides.length) % slides.length);

  return (
    <section
      className="relative overflow-hidden rounded-xl bg-top"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="hero"
    >
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((slide, i) => (
          <Link
            key={slide.href}
            href={slide.href}
            className="relative block h-80 w-full shrink-0 sm:h-96"
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative flex h-full items-center justify-between gap-8 px-6 sm:px-14">
              <div className="max-w-xl space-y-4 text-white">
                <span className="inline-block rounded bg-brand px-2.5 py-1 text-xs font-semibold">{slide.kicker}</span>
                <h2 className="line-clamp-3 text-3xl font-bold leading-tight sm:text-5xl">{slide.title}</h2>
                <p className="text-sm text-white/85 sm:text-base">
                  {slide.when}
                  {slide.where ? <span className="block text-white/70">{slide.where}</span> : null}
                </p>
                <span className="inline-block rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white">{cta}</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.image} alt="" className="hidden h-[85%] rounded-lg object-cover shadow-2xl sm:block" />
            </div>
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
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
