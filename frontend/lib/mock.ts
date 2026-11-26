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
 * THE STATIONS ARE REAL
 * The eight stations below are the real ones, in the order they are served,
 * with the coordinates from the survey. They are the same stations the
 * database holds and the same ones the read-only API returns, so the mock
 * route looks exactly like the live route.
 *
 * The coordinates are the ones used to draw the schematic diagram and to work
 * out the distance and the arrival time. The diagram says on it that it is not
 * for navigation.
 * ---------------------------------------------------------------------------
 */

/**
 * The eight stations, in the order they are served.
 *
 * These are the real names and the real positions. The Google Maps links live
 * in lib/stationContent.ts, because the read-only API does not carry them.
 */
const MOCK_STATIONS: { name: string; lat: number; lon: number }[] = [
  { name: "Guadalupe Ferry Station", lat: 14.5679915, lon: 121.0478734 },
  { name: "Hulo Ferry Station", lat: 14.5680204, lon: 121.0337175 },
  { name: "Valenzuela Ferry Station", lat: 14.5739117, lon: 121.0257227 },
  { name: "Lambingan Ferry Terminal", lat: 14.5872813, lon: 121.018456 },
  { name: "Santa Ana Ferry Station", lat: 14.5826753, lon: 121.0120195 },
  { name: "Pureza Ferry Terminal", lat: 14.6016408, lon: 121.0050997 },
  { name: "Quinta Market Ferry Terminal", lat: 14.5966352, lon: 120.982774 },
  { name: "Escolta River Ferry", lat: 14.5964417, lon: 120.9774937 },
];

/**
 * Length of one station to station segment, in km.
 *
 * The real route runs about 10.4 km from Guadalupe to Escolta over seven
 * segments, so each segment is about 1.5 km on average. The segments are not
 * all the same length in real life, but the ferry simulation only needs a
 * typical one.
 */
const SEGMENT_KM = 1.5;

const SECONDS_PER_HOUR = 3600;

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function getMockStations(scenario: MockScenario = "normal"): Station[] {
  return MOCK_STATIONS.map((station, i) => {
    const closed = scenario === "closed" && i === 4;
    return {
      id: i + 1,
      name: station.name,
      lat: station.lat,
      lon: station.lon,
      order: i + 1,
      isOpen: !closed,
      notice: closed
        ? "Docking repairs at this station. The next available ferry is at Pureza Ferry Terminal."
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
