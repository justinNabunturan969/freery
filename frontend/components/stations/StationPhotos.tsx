"use client";

import type { StationContent } from "@/lib/types";

/**
 * Station photos with captions.
 *
 * The stations have been surveyed, but no real photos have been taken yet, so
 * the panel shows the placeholder image. The caption under each one says what
 * the photo will be once it has been taken.
 */
export function StationPhotos({ content }: { content: StationContent }) {
  if (content.photos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-page/50 p-5 text-center">
        <p className="text-[13px] font-medium text-ink">Station photos pending</p>
        <p className="mt-1 text-[12px] text-ink-muted">
          Real photos have not been added for this station yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-strong">Station photos</h3>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {content.photos.map((photo) => (
          // The caption is the key, and not the picture. Every slot points at
          // the same placeholder image until real photos are taken, and two
          // children with the same key make React drop one of them.
          <li key={photo.caption}>
            <figure>
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                className="h-28 w-full rounded-lg border border-line object-cover sm:h-32"
              />
              <figcaption className="mt-1.5 text-[11px] text-ink-muted">
                {photo.caption}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
