import type { StationContent } from "./types";

/**
 * Static station content for the prototype.
 *
 * Operating hours, boarding information, photos, the Google Maps link and the
 * personnel contact of each station change rarely, so they live here instead
 * of in the database. Live open/closed state and notices still come from the
 * API.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDERS (replace before the real system goes live)
 * The physical device is not finished and the route has not been surveyed, so
 * every station on screen is a placeholder:
 *   - station names         -> "Station 1" to "Station 8", not real names.
 *   - coordinates           -> a synthetic straight east-west line, not real
 *                              positions. They exist so route progress, distance
 *                              and ETA work before the survey is done.
 *   - operatingHours and
 *     boardingInfo          -> copied from the reference screens. They are
 *                              examples, not verified station rules.
 *   - updatedAt             -> null, so the UI shows
 *                              "Station staff update: not yet updated" instead
 *                              of a made up timestamp.
 *   - photos                -> one placeholder image, labelled as such.
 *   - mapsUrl               -> null, and the placeholder coordinates are not
 *                              treated as a location, so the button stays
 *                              disabled and says "Location link pending".
 *   - contact               -> all null, so the panel shows
 *                              "pending" for every field.
 * Every station carries isPlaceholder so the UI can label it honestly instead
 * of passing example data off as real.
 * ---------------------------------------------------------------------------
 */

/**
 * The photo slots each station shows.
 *
 * The brief asks for two or three photos with captions such as "Station
 * entrance" and "Boarding area". The real photos do not exist yet, so every
 * slot points at the placeholder image and the caption says what the photo
 * will be once it is taken.
 */
const PHOTO_SLOTS = [
  {
    src: "/stations/photo-placeholder.svg",
    alt: "Placeholder for a photo of the station entrance, no real photo yet",
    caption: "Station entrance, pending",
  },
  {
    src: "/stations/photo-placeholder.svg",
    alt: "Placeholder for a photo of the boarding area, no real photo yet",
    caption: "Boarding area, pending",
  },
];

const OPERATING_HOURS = "Daily, 05:00 AM to 09:00 PM";
const BOARDING_INFO =
  "Use the main boarding area. Please arrive 10 minutes before departure.";

function content(stationId: number): StationContent {
  return {
    stationId,
    operatingHours: OPERATING_HOURS,
    boardingInfo: BOARDING_INFO,
    updatedAt: null,
    photos: PHOTO_SLOTS,
    mapsUrl: null,
    contact: { mobile: null, email: null, social: null },
    isPlaceholder: true,
  };
}

export const STATION_CONTENT: Record<number, StationContent> = Object.fromEntries(
  Array.from({ length: 8 }, (_, i) => [i + 1, content(i + 1)]),
);

export function getStationContent(stationId: number): StationContent {
  return (
    STATION_CONTENT[stationId] ?? {
      stationId,
      operatingHours: "Not yet published",
      boardingInfo: "Boarding information has not been published for this station yet.",
      updatedAt: null,
      photos: [],
      mapsUrl: null,
      contact: { mobile: null, email: null, social: null },
      isPlaceholder: true,
    }
  );
}

/**
 * A station with coordinates but no verified Google Maps link still needs a
 * way to open its location. Google Maps search links need no API key.
 *
 * Placeholder stations are excluded on purpose: their coordinates are
 * synthetic, so a search link would drop the passenger somewhere random.
 * Those stations show "Location link pending" until the survey is done.
 */
export function resolveMapsUrl(
  content: StationContent | undefined,
  lat: number,
  lon: number,
): string | null {
  if (content?.mapsUrl) return content.mapsUrl;
  if (content?.isPlaceholder) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat === 0 && lon === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/** True while the link is a generated search link rather than a verified pin. */
export function isVerifiedPin(content: StationContent | undefined): boolean {
  return Boolean(content?.mapsUrl);
}
