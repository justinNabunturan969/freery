"use client";

import { getStationContent, isVerifiedPin, resolveMapsUrl } from "@/lib/stationContent";
import { ROUTE_NAME } from "@/lib/constants";
import type { FerryView } from "@/lib/ferryView";
import type { Station } from "@/lib/types";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { ContactRow } from "@/components/ui/ContactRow";
import { LinkIcon, MailIcon, PhoneIcon } from "@/components/ui/icons";
import { MapsButton } from "./MapsButton";
import { StationPhotos } from "./StationPhotos";

/**
 * The panel that shows the selected station.
 *
 * Live open or closed state and the notice come from the API. Operating
 * hours, boarding information, photos, the Google Maps link and the contact
 * details come from the static file in lib/stationContent.ts.
 *
 * Everything a passenger would ask about a station is on this one panel: when
 * it is open, where it is, when the boats come, how to board, and how to reach
 * the people who work there.
 */
export function StationDetail({
  station,
  ferryViews,
  routePosition,
  stationCount = 8,
}: {
  station: Station;
  ferryViews: FerryView[];
  /** Index of this station on the route, used for "Stop 1 of 8". */
  routePosition: number;
  /** How many stops the route has right now. */
  stationCount?: number;
}) {
  const content = getStationContent(station.id);
  const mapsUrl = resolveMapsUrl(content, station.lat, station.lon);
  const verified = isVerifiedPin(content);
  const isPlaceholder = content.isPlaceholder === true;

  const nextFerry = ferryViews
    .filter((view) => view.toStation?.id === station.id && view.etaMinutes !== null)
    .sort((a, b) => (a.etaMinutes ?? 0) - (b.etaMinutes ?? 0))[0];

  const nextFerryText = nextFerry
    ? `${nextFerry.ferry.name} in ${nextFerry.etaText}`
    : "No arrival estimate available";

  return (
    <div className="grid gap-7 lg:grid-cols-[1.25fr_1fr]">
      <div className="min-w-0">
        <h2 className="text-[24px] font-bold tracking-tight text-ink-strong">
          {station.name}
        </h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
          <span
            className={`inline-flex items-center gap-1.5 font-medium ${
              station.isOpen ? "text-emerald-700" : "text-slate-600"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                station.isOpen ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {station.isOpen ? "Open" : "Closed"}
          </span>
          <span aria-hidden="true">·</span>
          <span>{ROUTE_NAME}</span>
        </p>
        <p className="mt-0.5 text-[13px] text-ink-faint">
          {ROUTE_NAME}, Stop {routePosition} of {stationCount}
        </p>

        {isPlaceholder ? (
          <div className="mt-3">
            <PlaceholderBadge label="Placeholder station" />
          </div>
        ) : null}

        {content.landmark ? (
          <p className="mt-3 text-[13px] text-ink-muted">
            Nearest landmark:{" "}
            <span className="font-medium text-ink">{content.landmark}</span>
          </p>
        ) : null}

        {station.notice ? (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
            {station.notice}
          </p>
        ) : null}

        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-ink-faint">
              Operating hours
            </dt>
            <dd className="mt-1 text-[14px] font-medium text-ink">
              {content.operatingHours}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] uppercase tracking-wide text-ink-faint">
              Next ferry
            </dt>
            <dd className="mt-1 text-[14px] font-medium text-ink">{nextFerryText}</dd>
          </div>
        </dl>

        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-[13px] font-semibold text-ink">Boarding information</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {content.boardingInfo}
          </p>
        </div>

        {/*
          The contacts. A passenger who wants to ask something needs a way to
          ask it, so the mobile number, the email address and the social link
          are here, on the same panel as everything else. A value that has not
          been published yet says so.
        */}
        <div className="mt-5 rounded-xl border border-line bg-white p-4">
          <p className="text-[13px] font-semibold text-ink">Station contacts</p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Reach the people who work at {station.name}.
          </p>
          <div className="mt-4 space-y-4">
            <ContactRow
              icon={PhoneIcon}
              label="Mobile number"
              value={content.contact.mobile}
            />
            <ContactRow
              icon={MailIcon}
              label="Email address"
              value={content.contact.email}
            />
            <ContactRow
              icon={LinkIcon}
              label="Social link"
              value={content.contact.social}
            />
          </div>
        </div>

        <p className="mt-4 text-[12px] text-ink-faint">
          Station staff update:{" "}
          <span className="text-ink-muted">
            {content.updatedAt
              ? new Date(content.updatedAt).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "not yet updated"}
          </span>
        </p>
      </div>

      <div className="min-w-0">
        <StationPhotos content={content} />
        <MapsButton url={mapsUrl} verified={verified} className="mt-4" />
      </div>
    </div>
  );
}
