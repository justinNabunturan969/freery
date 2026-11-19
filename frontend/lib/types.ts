import { z } from "zod";

/**
 * The public data contract (section 6 of the public brief).
 *
 * The read-only API on the station PC and the mock generator in lib/mock.ts
 * both return exactly these shapes. Nothing here may be changed without
 * changing both sides.
 */

/**
 * The three states a boat can be in.
 *
 * The status is worked out by the database from the boat's own packets, so it
 * cannot be set by an administrator and the console and this website cannot
 * disagree about it. A boat that is out of the fleet is OFFLINE, a boat that
 * is not moving is DOCKED, and a boat that is moving is IN_TRANSIT. There is
 * no "boarding" and no "delayed", because nobody at the station can know
 * those things while the boat is on its way.
 */
export type FerryStatus = "DOCKED" | "IN_TRANSIT" | "OFFLINE";

export interface Ferry {
  id: number;
  name: string;
  status: FerryStatus;
  lat: number | null;
  lon: number | null;
  /** km/h */
  speed: number | null;
  seatsAvailable: number;
  capacity: number;
  /** ISO timestamp of the last GPS packet */
  receivedAt: string | null;
  /**
   * The identity colour of the boat, a name from the palette.
   *
   * It is on the boat itself, so the same boat is always drawn in the same
   * colour, here and on the console.
   */
  color?: string | null;
}

export interface FerriesResponse {
  servedAt: string;
  ferries: Ferry[];
}

export interface Station {
  id: number;
  name: string;
  lat: number;
  lon: number;
  order: number;
  isOpen: boolean;
  notice: string | null;
}

export interface StationsResponse {
  stations: Station[];
}

/**
 * Static content kept in the public app (lib/stationContent.ts) for the
 * prototype. Operating hours, boarding information, photos, the Google Maps
 * link and contact details change rarely, so they live in a static file and
 * can move into the database later.
 */
export interface StationContent {
  stationId: number;
  operatingHours: string;
  boardingInfo: string;
  /** When station staff last updated this text */
  updatedAt: string | null;
  photos: { src: string; alt: string; caption: string }[];
  /** Google Maps link to the station's exact location */
  mapsUrl: string | null;
  contact: {
    mobile: string | null;
    email: string | null;
    social: string | null;
  };
  /**
   * True while the name, coordinates, photos and details of this station are
   * still placeholders. The physical device and the route survey are not
   * finished, so nothing about this station is real yet and the UI has to
   * say so instead of pretending otherwise.
   */
  isPlaceholder?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Runtime validation                                                         */
/* -------------------------------------------------------------------------- */

export const ferryStatusSchema = z.enum(["DOCKED", "IN_TRANSIT", "OFFLINE"]);

export const ferrySchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  status: ferryStatusSchema,
  lat: z.number().min(-90).max(90).nullable(),
  lon: z.number().min(-180).max(180).nullable(),
  speed: z.number().min(0).nullable(),
  seatsAvailable: z.number().int().min(0),
  capacity: z.number().int().min(1),
  receivedAt: z.string().nullable(),
  /** The identity colour of the boat. */
  color: z.string().nullable().optional(),
});

export const ferriesResponseSchema = z.object({
  servedAt: z.string(),
  ferries: z.array(ferrySchema),
});

export const stationSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  order: z.number().int(),
  isOpen: z.boolean(),
  notice: z.string().nullable(),
});

export const stationsResponseSchema = z.object({
  stations: z.array(stationSchema),
});

export type ValidatedFerries = z.infer<typeof ferriesResponseSchema>;
export type ValidatedStations = z.infer<typeof stationsResponseSchema>;
