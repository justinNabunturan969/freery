"use client";

import { RouteCard } from "@/components/tracking/RouteCard";
import { SectionLink } from "@/components/ui/SectionLink";
import type { FerryView } from "@/lib/ferryView";
import type { Station } from "@/lib/types";

/**
 * The landing hero: the promise, the two calls to action, and a preview of
 * the live route.
 *
 * The preview is the same RouteCard the tracking board shows, so what a
 * visitor sees on the home page is exactly what they get when they scroll
 * down to the ferries.
 */
export function Hero({
  useMock,
  stations,
  views,
  servedAt,
  loading,
}: {
  useMock: boolean;
  stations: Station[];
  views: FerryView[];
  servedAt: string | null;
  loading: boolean;
}) {
  return (
    <section
      id="top"
      tabIndex={-1}
      className="scroll-mt-[96px] border-b border-line bg-white"
    >
      <div className="mx-auto grid w-full max-w-shell items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 xl:grid-cols-[0.85fr_1.15fr] xl:gap-14">
        <div className="max-w-xl">
          <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-brand-600">
            Ferry tracking, made clear
          </p>
          <h1 className="mt-4 text-[36px] font-bold leading-[1.08] tracking-tight text-ink-strong sm:text-[48px]">
            Less waiting.
            <br />
            More certainty.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted sm:text-[16px]">
            Know where your ferry is and how many seats are estimated to be
            free, so you can plan your crossing before you reach the port.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <SectionLink
              id="ferries"
              className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-brand-500 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Find my ferry
            </SectionLink>
            <SectionLink
              id="how-it-works"
              className="inline-flex min-h-[46px] items-center justify-center rounded-lg border border-line-strong bg-white px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-brand-50"
            >
              How it works
            </SectionLink>
          </div>

          <p className="mt-5 text-[13px] text-ink-muted">
            Built for passengers. Supported by station staff.
          </p>

          {useMock ? (
            <p className="mt-3 text-[12px] text-amber-700">
              This preview shows example data while the live station API is
              being set up.
            </p>
          ) : null}
        </div>

        <div className="relative pb-12 sm:pb-14">
          <RouteCard
            stations={stations}
            views={views}
            servedAt={servedAt}
            useMock={useMock}
            loading={loading}
          />
          <div className="absolute bottom-0 right-5 hidden rounded-xl border border-line bg-white px-4 py-3 shadow-lift sm:block">
            <p className="text-[12px] font-semibold text-ink">Seat estimates</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Updated by station staff, not by the GPS.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
