import type { Ferry, FerriesResponse, Station, StationsResponse } from "./types";
import { FERRY_CAPACITY, MOCK_TIME_SCALE, type FerryColorName } from "./constants";
import { interpolateOnRoute } from "./routeProgress";
import { MOCK_SCENARIOS, type MockScenario } from "./mockScenarios";

export { MOCK_SCENARIOS };
export type { MockScenario };

/**
 * Mock mode.
 *
 * USE_MOCK=true makes the app return generated data, including ferries that
 * move along the route, so the app works before the station PC and the
 * read-only API exist. Switching to real data is an environment variable
 * change, not a rewrite.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDER STATION COORDINATES
 * The real names and coordinates of the 8 stations are not known yet
 * (section 15 of the brief). The points below are obviously synthetic: they
 * sit on one straight east west line, about 3.2 km apart, with round
 * coordinates. They exist only so that route progress, distance and ETA work
 * before the real API is ready. Replace them with the surveyed coordinates.
 * ---------------------------------------------------------------------------
 */

const PLACEHOLDER_LAT = 14.6;
const PLACEHOLDER_LON_START = 120.95;
/** ~3.2 km at this latitude. */
const PLACEHOLDER_LON_STEP = 0.0297;

/** Length of one station to station segment, in km. */
const SEGMENT_KM = 3.2;

const SECONDS_PER_HOUR = 3600;

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function getMockStations(scenario: MockScenario = "normal"): Station[] {
  return Array.from({ length: 8 }, (_, i) => {
    const closed = scenario === "closed" && i === 4;
    return {
      id: i + 1,
      name: `Station ${i + 1}`,
      lat: PLACEHOLDER_LAT,
      lon: round6(PLACEHOLDER_LON_START + i * PLACEHOLDER_LON_STEP),
      order: i + 1,
      isOpen: !closed,
      notice: closed
        ? "Docking repairs at this station. The next available ferry is at Station 6."
        : null,
    };
  });
}

export function getMockStationsResponse(
  scenario: MockScenario = "normal",
): StationsResponse {
  return { stations: getMockStations(scenario) };
}

/* -------------------------------------------------------------------------- */
/* Ferry simulation                                                           */
/* -------------------------------------------------------------------------- */

interface FerrySim {
  id: number;
  name: string;
  /** The identity colour of the boat, the same one the console gives it. */
  color: FerryColorName;
  /** Reported speed in km/h. */
  speed: number;
  seatsBase: number;
  /** Travel time for one segment, in scaled seconds. */
  travelSeconds: number;
  /** Dwell time at a station, in scaled seconds. */
  dwellSeconds: number;
  /** Offset into the simulated cycle, in scaled seconds. */
  offsetSeconds: number;
  /** Reversed ferries travel from the last station back down the route. */
  reversed: boolean;
  offline: boolean;
}

/**
 * The simulation starts when the first request arrives, so the ferries
 * always begin in the same readable state and then keep moving from there.
 */
let simulationStart: number | null = null;

function scaledElapsed(now: number): number {
  if (simulationStart === null) simulationStart = now;
  const raw = (now - simulationStart) / 1000;
  return raw > 0 ? raw * MOCK_TIME_SCALE : 0;
}

const SIMS: FerrySim[] = [
  {
    id: 1,
    name: "Ferry 1",
    color: "orange",
    speed: 18,
    seatsBase: 14,
    travelSeconds: (SEGMENT_KM / 18) * SECONDS_PER_HOUR,
    dwellSeconds: 90,
    offsetSeconds: 429,
    reversed: false,
    offline: false,
  },
  {
    id: 2,
    name: "Ferry 2",
    color: "purple",
    speed: 21,
    seatsBase: 22,
    travelSeconds: (SEGMENT_KM / 21) * SECONDS_PER_HOUR,
    dwellSeconds: 90,
    offsetSeconds: 2076,
    reversed: false,
    offline: false,
  },
  {
    id: 3,
    name: "Ferry 3",
    color: "green",
    speed: 18,
    seatsBase: 40,
    travelSeconds: (SEGMENT_KM / 18) * SECONDS_PER_HOUR,
    dwellSeconds: 600,
    offsetSeconds: 0,
    reversed: true,
    offline: false,
  },
  {
    id: 4,
    name: "Ferry 4",
    color: "gray",
    speed: 0,
    seatsBase: 0,
    travelSeconds: 0,
    dwellSeconds: 0,
    offsetSeconds: 0,
    reversed: false,
    offline: true,
  },
];

interface SimPosition {
  /** Position on the route, 0 at the first station and 1 at the last. */
  routePosition: number;
  /** True while the ferry is stopped at a station. */
  dwelling: boolean;
  /** Index of the station the ferry is at, or heading away from. */
  stationIndex: number;
}

function simulate(sim: FerrySim, elapsed: number): SimPosition {
  const cycle = sim.travelSeconds + sim.dwellSeconds;
  const total = elapsed + sim.offsetSeconds;
  const leg = Math.floor(total / cycle) % 7;
  const within = total % cycle;

  if (within < sim.dwellSeconds) {
    // Stopped at a station.
    const stationIndex = sim.reversed ? 7 - leg : leg;
    return {
      routePosition: stationIndex / 7,
      dwelling: true,
      stationIndex,
    };
  }

  const progress = (within - sim.dwellSeconds) / sim.travelSeconds;
  const legPosition = leg + progress;
  const stationIndex = sim.reversed ? 7 - leg : leg;
  const routePosition = sim.reversed
    ? (7 - legPosition) / 7
    : legPosition / 7;

  return {
    routePosition: Math.max(0, Math.min(1, routePosition)),
    dwelling: false,
    stationIndex,
  };
}

export function getMockFerries(
  now: number = Date.now(),
  scenario: MockScenario = "normal",
): FerriesResponse {
  const elapsed = scaledElapsed(now);
  const stations = getMockStations(scenario);

  const ferries: Ferry[] = SIMS.map((sim) => {
    if (sim.offline) {
      return {
        id: sim.id,
        name: sim.name,
        status: "OFFLINE",
        lat: null,
        lon: null,
        speed: null,
        seatsAvailable: 0,
        capacity: FERRY_CAPACITY,
        receivedAt: null,
        color: sim.color,
      };
    }

    const position = simulate(sim, elapsed);
    const point = interpolateOnRoute(position.routePosition, stations);

    // A small reading delay per ferry, so the ages differ realistically.
    const lagSeconds = sim.id * 5;
    const packetAge = scenario === "stale" ? 180 + sim.id * 12 : lagSeconds;

    const seatWave = Math.round(
      (sim.id === 1 ? 5 : 4) * Math.sin(elapsed / 240),
    );

    return {
      id: sim.id,
      name: sim.name,
      status: position.dwelling ? "DOCKED" : "IN_TRANSIT",
      lat: point ? round6(point.lat) : null,
      lon: point ? round6(point.lon) : null,
      speed: position.dwelling ? 0 : sim.speed,
      seatsAvailable: Math.max(0, Math.min(FERRY_CAPACITY, sim.seatsBase + seatWave)),
      capacity: FERRY_CAPACITY,
      receivedAt: new Date(now - packetAge * 1000).toISOString(),
      color: sim.color,
    };
  });

  return { servedAt: new Date(now).toISOString(), ferries };
}
