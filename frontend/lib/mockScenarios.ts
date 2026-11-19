/**
 * The mock data states the app can be switched into.
 *
 * This list lives in its own file so the browser bundle can read it without
 * pulling in the mock generator in lib/mock.ts.
 */
export type MockScenario =
  | "normal"
  | "stale"
  | "offline"
  | "error"
  | "closed";

export const MOCK_SCENARIOS: MockScenario[] = [
  "normal",
  "stale",
  "offline",
  "error",
  "closed",
];
