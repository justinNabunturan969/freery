import {
  ferriesResponseSchema,
  stationsResponseSchema,
  type FerriesResponse,
  type StationsResponse,
} from "./types";
import { MOCK_SCENARIOS, type MockScenario } from "./mockScenarios";

/**
 * The browser only ever calls this app's own routes (/api/ferries,
 * /api/stations). Those routes call the read-only API on the station PC or
 * return mock data. The API secret never reaches the browser.
 */

export class ApiError extends Error {
  readonly status: number;
  /** True when the station could not be reached (HTTP 503). */
  readonly offline: boolean;

  constructor(message: string, status: number, offline = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.offline = offline;
  }
}

export function normalizeScenario(value: string | null | undefined): MockScenario {
  if (value && (MOCK_SCENARIOS as string[]).includes(value)) {
    return value as MockScenario;
  }
  return "normal";
}

/** Build the URL the browser calls. The scenario only matters in mock mode. */
export function ferriesUrl(scenario: MockScenario): string {
  return `/api/ferries?scenario=${scenario}`;
}

export function stationsUrl(scenario: MockScenario): string {
  return `/api/stations?scenario=${scenario}`;
}

async function request(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    // Network level failure: the station is unreachable.
    throw new ApiError("Station offline, showing last known data", 503, true);
  }

  if (response.status === 503) {
    throw new ApiError("Station offline, showing last known data", 503, true);
  }
  if (!response.ok) {
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }
  return response.json();
}

/** SWR fetcher for the ferries route. Validates the payload with zod. */
export const fetchFerries = async (url: string): Promise<FerriesResponse> => {
  const data = await request(url);
  const parsed = ferriesResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError("Unexpected response from the station API", 502);
  }
  return parsed.data;
};

/** SWR fetcher for the stations route. Validates the payload with zod. */
export const fetchStations = async (url: string): Promise<StationsResponse> => {
  const data = await request(url);
  const parsed = stationsResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError("Unexpected response from the station API", 502);
  }
  return parsed.data;
};
