import type { Station } from "./types";
import type { LatLon } from "./eta";

/**
 * Ferry position on the schematic route.
 *
 * The route is a straight line of evenly spaced station dots, not a street
 * map. A ferry's real GPS position is projected onto the nearest segment
 * between two consecutive stations, so it can be drawn on that line.
 */

export type Direction = "up" | "down" | "unknown";

export interface RouteProjection {
  /** Index of the segment, 0 based, between stations[i] and stations[i+1]. */
  segmentIndex: number;
  /** Fraction along that segment, 0 to 1. */
  t: number;
  /** Position on the whole route, 0 at the first station, 1 at the last. */
  routePosition: number;
  /** How far the raw position sits from the route line, in km. */
  offsetKm: number;
}

/**
 * Local flat frame in kilometres. Good enough over one route and keeps the
 * projection stable for the schematic line.
 */
function toLocalKm(point: LatLon, origin: LatLon): { x: number; y: number } {
  const latKm = 110.574;
  const lonKm = 111.32 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (point.lon - origin.lon) * lonKm,
    y: (point.lat - origin.lat) * latKm,
  };
}

/**
 * Project a GPS position onto the station polyline and return the nearest
 * segment together with the fraction along it.
 *
 * The segment that actually contains the position wins. Only when the
 * position sits past the end of the route does the closest segment win, so a
 * ferry between two stations is never snapped onto a different pair.
 */
export function projectOntoRoute(
  position: LatLon,
  stations: Station[],
): RouteProjection | null {
  if (stations.length < 2) return null;
  const origin = stations[0];
  if (!origin) return null;

  const p = toLocalKm(position, origin);
  let best: RouteProjection | null = null;
  let bestOutside: RouteProjection | null = null;

  for (let i = 0; i < stations.length - 1; i += 1) {
    const a = stations[i];
    const b = stations[i + 1];
    if (!a || !b) continue;

    const A = toLocalKm(a, origin);
    const B = toLocalKm(b, origin);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) continue;

    const raw = ((p.x - A.x) * dx + (p.y - A.y) * dy) / lengthSq;
    const t = Math.max(0, Math.min(1, raw));

    const projX = A.x + t * dx;
    const projY = A.y + t * dy;
    const offsetKm = Math.hypot(p.x - projX, p.y - projY);

    const projection: RouteProjection = {
      segmentIndex: i,
      t,
      routePosition: (i + t) / (stations.length - 1),
      offsetKm,
    };

    if (raw >= 0 && raw <= 1) {
      if (!best || offsetKm < best.offsetKm) best = projection;
    } else if (!bestOutside || offsetKm < bestOutside.offsetKm) {
      bestOutside = projection;
    }
  }

  return best ?? bestOutside;
}

/**
 * Turn a position on the route back into coordinates. Used by the mock
 * generator so the simulated ferries sit exactly on the schematic line.
 */
export function interpolateOnRoute(
  routePosition: number,
  stations: Station[],
): LatLon | null {
  if (stations.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, routePosition));
  const scaled = clamped * (stations.length - 1);
  const index = Math.min(stations.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const a = stations[index];
  const b = stations[index + 1] ?? stations[index];
  if (!a || !b) return null;
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
  };
}

/**
 * Compare the last two kept positions. Moving toward a higher station number
 * means heading up the route, toward a lower one means heading back.
 */
export function directionBetween(
  previous: number | null,
  next: number,
): Direction {
  if (previous === null) return "unknown";
  const delta = next - previous;
  if (Math.abs(delta) < 0.0005) return "unknown";
  return delta > 0 ? "up" : "down";
}

/**
 * Index of the station the ferry is heading to.
 * Returns null when there is nowhere left to go in that direction.
 */
export function nextStationIndex(
  routePosition: number,
  direction: Direction,
  stationCount: number,
): number | null {
  const last = stationCount - 1;
  if (direction === "down") {
    const index = Math.ceil(routePosition) - 1;
    return index < 0 ? null : Math.max(0, Math.min(last, index));
  }
  const index = Math.floor(routePosition) + 1;
  if (index > last) return null;
  return index;
}

/**
 * The "Station 1 to Station 2" pair shown for a ferry.
 * `from` is the station it came from, `to` is the station it is heading to.
 */
export function routeEndpoints(
  routePosition: number,
  direction: Direction,
  segmentIndex: number,
  stationCount: number,
): { fromIndex: number; toIndex: number } {
  const last = stationCount - 1;
  if (direction === "down") {
    const from = Math.min(last, Math.max(0, Math.ceil(routePosition)));
    const to = Math.max(0, from - 1);
    return { fromIndex: from, toIndex: to };
  }
  if (direction === "up") {
    const from = Math.min(last, Math.max(0, Math.floor(routePosition)));
    const to = Math.min(last, from + 1);
    return { fromIndex: from, toIndex: to };
  }
  // No direction yet: show only the nearest segment.
  const from = Math.min(last, Math.max(0, segmentIndex));
  return { fromIndex: from, toIndex: Math.min(last, from + 1) };
}
