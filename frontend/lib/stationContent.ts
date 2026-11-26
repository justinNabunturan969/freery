import type { StationContent } from "./types";

/**
 * Station content for the prototype.
 *
 * Operating hours, boarding information, photos, the Google Maps link and the
 * personnel contact of each station change rarely, so they live here instead
 * of in the database. Live open/closed state and notices still come from the
 * API.
 *
 * ---------------------------------------------------------------------------
 * THE STATIONS ARE REAL
 * The eight stations on the route are the real ones, in the order they are
 * served. Their names and their Google Maps links come from the survey
 * document, which carries a Google place ID for each station. The place ID is
 * what makes the link open that exact place.
 *
 * The links here are the same links that the database holds in the
 * "mapsUrl" column of the Station table. The check in
 * .briefs/check-station-links.mjs makes sure the two never drift apart.
 *
 * STILL PLACEHOLDERS
 *   - operatingHours and boardingInfo -> examples, not verified station rules.
 *   - updatedAt                      -> null, so the UI shows
 *                                        "Station staff update: not yet updated"
 *                                        instead of a made up timestamp.
 *   - photos                         -> one placeholder image, labelled as such.
 *   - contact                        -> all null, so the panel shows
 *                                        "pending" for every field.
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

/**
 * The eight stations, in the order they are served.
 *
 * `mapsUrl` is Google's own link for the exact place, built from the place
 * ID in the survey document. `landmark` is the nearest landmark named in the
 * same document, which is what a passenger asks a person on the ground for.
 */
const STATIONS: {
  id: number;
  name: string;
  /** The short name, without "Ferry Station" or "Ferry Terminal". */
  shortName: string;
  landmark: string;
  mapsUrl: string;
}[] = [
  {
    id: 1,
    name: "Guadalupe Ferry Station",
    shortName: "Guadalupe",
    landmark: "MRT-3 Guadalupe Station",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Guadalupe+Ferry+Station&query_place_id=ChIJz-js4lrIlzMRn-EsWwlYPXE",
  },
  {
    id: 2,
    name: "Hulo Ferry Station",
    shortName: "Hulo",
    landmark: "Parish of Our Lady of the Abandoned",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Hulo+Ferry+Station&query_place_id=ChIJ8U6HNVPIlzMRR3apRQPmW90",
  },
  {
    id: 3,
    name: "Valenzuela Ferry Station",
    shortName: "Valenzuela",
    landmark: "LTO Makati District Office",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Valenzuela+Ferry+Station&query_place_id=ChIJ9UoKxbHJlzMRZdSSgEoCBEI",
  },
  {
    id: 4,
    name: "Lambingan Ferry Terminal",
    shortName: "Lambingan",
    landmark: "Tomas Earnshaw Elementary School",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Lambingan+Ferry+Terminal&query_place_id=ChIJyxFJUcbJlzMRXAAU1BpzOlw",
  },
  {
    id: 5,
    name: "Santa Ana Ferry Station",
    shortName: "Santa Ana",
    landmark: "Santa Ana Public Market",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Santa+Ana+Ferry+Station+Manila&query_place_id=ChIJpedvSr7JlzMRa7G_ug2SysU",
  },
  {
    id: 6,
    name: "Pureza Ferry Terminal",
    shortName: "Pureza",
    landmark: "Philippine Coast Guard Station",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Pureza+Ferry+Terminal&query_place_id=ChIJqfz_VN3JlzMRkisPMl7KHOc",
  },
  {
    id: 7,
    name: "Quinta Market Ferry Terminal",
    shortName: "Quinta Market",
    landmark: "Quinta Market and Quiapo Church",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Quinta+Market+Ferry+Terminal&query_place_id=ChIJiTr5CxzKlzMRup14ZcZNVHo",
  },
  {
    id: 8,
    name: "Escolta River Ferry",
    shortName: "Escolta",
    landmark: "Jones Bridge and Bureau of Immigration",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Escolta+River+Ferry&query_place_id=ChIJFfMSFxrKlzMRKmi8vi2HaPs",
  },
];

function content(stationId: number): StationContent {
  const station = STATIONS.find((row) => row.id === stationId);

  if (!station) {
    return {
      stationId,
      operatingHours: "Not yet published",
      boardingInfo: "Boarding information has not been published for this station yet.",
      updatedAt: null,
      photos: [],
      mapsUrl: null,
      landmark: null,
      shortName: null,
      contact: { mobile: null, email: null, social: null },
      isPlaceholder: true,
    };
  }

  return {
    stationId,
    operatingHours: OPERATING_HOURS,
    boardingInfo: BOARDING_INFO,
    updatedAt: null,
    photos: PHOTO_SLOTS,
    mapsUrl: station.mapsUrl,
    landmark: station.landmark,
    shortName: station.shortName,
    contact: { mobile: null, email: null, social: null },
    isPlaceholder: false,
  };
}

export const STATION_CONTENT: Record<number, StationContent> = Object.fromEntries(
  STATIONS.map((station) => [station.id, content(station.id)]),
);

/** The stations in the order they are served, for the list on the landing page. */
export const STATION_LIST = STATIONS.map((station) => ({
  id: station.id,
  name: station.name,
  shortName: station.shortName,
  landmark: station.landmark,
  mapsUrl: station.mapsUrl,
}));

export function getStationContent(stationId: number): StationContent {
  return content(stationId);
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
