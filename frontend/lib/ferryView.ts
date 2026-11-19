import type { Ferry, Station } from "./types";
import { STALE_SECONDS } from "./constants";
import { etaMinutes, formatEta, haversineKm } from "./eta";
import {
  directionBetween,
  nextStationIndex,
  projectOntoRoute,
  routeEndpoints,
  type Direction,
} from "./routeProgress";
import {
  freshnessOf,
  markerState,
  ageSeconds,
  describeAge,
  describeAgeShort,
} from "./stale";

/**
 * Everything the UI needs about one ferry, derived in the browser from the
 * raw contract: where it sits on the schematic route, which way it is
 * heading, how long until it arrives and how many seats are free.
 */

export interface FerryView {
  ferry: Ferry;
  /** Position on the route, 0 at the first station and 1 at the last. */
  routePosition: number | null;
  direction: Direction;
  /** The station the ferry came from. */
  fromStation: Station | null;
  /** The station the ferry is heading to. */
  toStation: Station | null;
  /** The station the ferry is stopped at. */
  atStation: Station | null;
  /** "Station 1 → Station 2" */
  routeLabel: string;
  /** "Station 2 · 5 min", used inside the callout. */
  locationLabel: string;
  /**
   * The sentence that sits above the ferry icon.
   *
   * "Arrives Station 2 in 5 min" while the boat is on its way, "Now at
   * Station 2" while it is stopped. It is worked out from the boat's own last
   * packet, so the passenger is told when the boat is due rather than being
   * told a status somebody typed in by hand.
   */
  arrivalLabel: string;
  etaMinutes: number | null;
  etaText: string;
  seatsFree: number;
  seatsLabel: string;
  marker: "normal" | "stale" | "offline";
  stale: boolean;
  isLive: boolean;
  /** "Last known location, 3 min ago" when the ferry data is stale. */
  staleLabel: string | null;
  /**
   * "3 min", the short form of the age, for the narrow callout card.
   *
   * The callout has room for about twenty characters, and the full wording
   * does not fit there.
   */
  staleAge: string | null;
}

export type PositionMap = Record<number, number>;

function nearestStation(
  position: { lat: number; lon: number },
  stations: Station[],
): Station | null {
  let best: Station | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const station of stations) {
    const distance = haversineKm(position, station);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return best;
}

export function computeFerryViews(
  ferries: Ferry[],
  stations: Station[],
  previousPositions: PositionMap = {},
  now: number = Date.now(),
  staleSeconds: number = STALE_SECONDS,
): { views: FerryView[]; positions: PositionMap } {
  const positions: PositionMap = {};

  const views = ferries.map((ferry): FerryView => {
    const marker = markerState(ferry.status, ferry.receivedAt, now, staleSeconds);
    const stale = freshnessOf(ferry.receivedAt, now, staleSeconds) === "stale";
    const offline = ferry.status === "OFFLINE";
    const hasPosition = ferry.lat !== null && ferry.lon !== null;

    const projection = hasPosition
      ? projectOntoRoute({ lat: ferry.lat as number, lon: ferry.lon as number }, stations)
      : null;

    const routePosition = projection ? projection.routePosition : null;
    if (routePosition !== null) positions[ferry.id] = routePosition;

    const direction = directionBetween(
      previousPositions[ferry.id] ?? null,
      routePosition ?? previousPositions[ferry.id] ?? 0,
    );

    const segmentIndex = projection?.segmentIndex ?? 0;
    const endpoints = routeEndpoints(
      routePosition ?? 0,
      direction,
      segmentIndex,
      stations.length,
    );

    const fromStation = stations[endpoints.fromIndex] ?? null;
    const toStation = stations[endpoints.toIndex] ?? null;

    // A boat that is not moving is stopped. The status says so, because the
    // database works it out from the last packet the boat sent.
    const stopped = ferry.status === "DOCKED";
    const atStation =
      stopped && hasPosition
        ? nearestStation({ lat: ferry.lat as number, lon: ferry.lon as number }, stations)
        : null;

    // ETA only makes sense while the ferry is actually moving toward a
    // station. A stopped, offline or stale ferry shows a dash.
    let eta: number | null = null;
    let etaText = "—";
    let nextStation: Station | null = null;

    if (stopped && atStation) {
      etaText = "At station";
    } else if (!offline && !stale && hasPosition && toStation) {
      const index = nextStationIndex(routePosition ?? 0, direction, stations.length);
      nextStation = index === null ? null : (stations[index] ?? null);
      const distance = haversineKm(
        { lat: ferry.lat as number, lon: ferry.lon as number },
        nextStation ?? toStation,
      );
      eta = etaMinutes(distance, ferry.speed);
      etaText = formatEta(eta);
    }

    // A boat that has not reported a position has no route to show. Saying
    // "Station 1 to Station 2" would be a guess, so it says what is true.
    const routeLabel = !hasPosition
      ? "No GPS position yet"
      : stopped && atStation
        ? `Docked at ${atStation.name}`
        : fromStation && toStation
          ? `${fromStation.name} to ${toStation.name}`
          : "";

    const locationLabel = !hasPosition
      ? "No GPS position yet"
      : stopped && atStation
        ? `${atStation.name} · At station`
        : nextStation
          ? `${nextStation.name} · ${etaText}`
          : fromStation && toStation
            ? `${fromStation.name} to ${toStation.name}`
            : "";

    /*
     * The sentence that sits above the ferry icon.
     *
     * It answers the only question that matters at the dock: when does the
     * boat get here? The number comes from the boat's own last packet, so it
     * is an estimate, and the sentence says so rather than promising a time.
     * When there is nothing to promise, it says that instead of guessing.
     */
    const age = ageSeconds(ferry.receivedAt, now);
    let arrivalLabel: string;

    if (offline) {
      arrivalLabel = "Out of service";
    } else if (!hasPosition || ferry.receivedAt === null) {
      arrivalLabel = "Waiting for its first GPS packet";
    } else if (stale) {
      arrivalLabel = `Last seen ${describeAgeShort(age)}`;
    } else if (atStation) {
      arrivalLabel = `Now at ${atStation.name}`;
    } else if (nextStation && eta !== null) {
      arrivalLabel =
        eta < 1
          ? `Arriving at ${nextStation.name} now`
          : `Arrives ${nextStation.name} in ${etaText}`;
    } else if (nextStation) {
      arrivalLabel = `Heading to ${nextStation.name}`;
    } else if (fromStation && toStation) {
      arrivalLabel = `${fromStation.name} to ${toStation.name}`;
    } else {
      arrivalLabel = "On the route";
    }

    return {
      ferry,
      routePosition,
      direction,
      fromStation,
      toStation,
      atStation,
      routeLabel,
      locationLabel,
      arrivalLabel,
      etaMinutes: eta,
      etaText,
      seatsFree: ferry.seatsAvailable,
      seatsLabel: offline ? "Unavailable" : `${ferry.seatsAvailable} seats available`,
      marker,
      stale,
      isLive: marker === "normal",
      staleLabel: stale
        ? `Last known location, ${describeAge(ageSeconds(ferry.receivedAt, now))}`
        : null,
      staleAge: stale
        ? describeAgeShort(ageSeconds(ferry.receivedAt, now))
        : null,
    };
  });

  return { views, positions };
}
