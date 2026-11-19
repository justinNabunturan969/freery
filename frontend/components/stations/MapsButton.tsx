"use client";

import { ExternalIcon } from "@/components/ui/icons";

/**
 * The only map element on the Stations page: a link out to Google Maps.
 * No embedded map, no API key. If there is no link and no coordinate the
 * button is disabled and the label says the link is pending.
 */
export function MapsButton({
  url,
  verified,
  className = "",
}: {
  url: string | null;
  verified: boolean;
  className?: string;
}) {
  if (!url) {
    return (
      <div className={className}>
        <button
          type="button"
          disabled
          className="inline-flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-[14px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200"
        >
          Location link pending
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-600"
      >
        Find this station on Google Maps
        <ExternalIcon className="h-4 w-4" />
      </a>
      <p className="mt-2 text-[11px] text-ink-faint">
        {verified
          ? "Map link opens in a new tab."
          : "Example locations · Map link opens in a new tab, not verified"}
      </p>
    </div>
  );
}
