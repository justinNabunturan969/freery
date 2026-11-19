/**
 * Distance and ETA, computed in the browser from the ferry position and its
 * reported speed. No paid directions service is used.
 */

export const EARTH_RADIUS_KM = 6371;

export interface LatLon {
  lat: number;
  lon: number;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Great circle distance between two points, in kilometres.
 * d = 2R asin( sqrt( sin^2(dphi/2) + cos(phi1) cos(phi2) sin^2(dlambda/2) ) )
 */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * ETA in minutes from a distance and a speed in km/h.
 * Returns null when there is no usable speed (stopped, offline, no reading).
 */
export function etaMinutes(
  distanceKm: number | null,
  speedKmh: number | null,
): number | null {
  if (distanceKm === null || speedKmh === null) return null;
  if (!Number.isFinite(distanceKm) || !Number.isFinite(speedKmh)) return null;
  if (speedKmh < 1) return null;
  return (distanceKm / speedKmh) * 60;
}

/** Passenger facing ETA text. */
export function formatEta(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return "—";
  if (minutes < 1) return "< 1 min";
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Speed text, or a dash when there is no reading. */
export function formatSpeed(speedKmh: number | null): string {
  if (speedKmh === null || !Number.isFinite(speedKmh)) return "—";
  return `${Math.round(speedKmh)} km/h`;
}
