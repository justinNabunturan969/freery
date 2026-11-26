import type { FerryStatus } from "./types";

/** The one route this prototype covers. */
export const ROUTE_NAME = "Route A";

/** Number of stops on Route A. */
export const STATION_COUNT = 8;

/**
 * Ferry identity colours. Used on markers, icons, seat bars and callouts.
 *
 * The palette is the same one in `packages/shared/ferryColors.ts`. This app
 * is deployed on its own and does not share that package, so it keeps its
 * own copy. The two have to agree on the names, and the database refuses a
 * colour that is not on the list.
 */
export const FERRY_COLOR_NAMES = [
  "orange",
  "purple",
  "green",
  "gray",
  "blue",
  "pink",
] as const;

export type FerryColorName = (typeof FERRY_COLOR_NAMES)[number];

export function isFerryColorName(value: unknown): value is FerryColorName {
  return (
    typeof value === "string" &&
    (FERRY_COLOR_NAMES as readonly string[]).includes(value)
  );
}

/**
 * The identity colour of one boat.
 *
 * The colour is kept on the boat row in the database, so the boat keeps the
 * same colour here and on the console, and it keeps it even while it is out
 * of service. A boat with no colour on its row is a boat that was added
 * before the colour existed, so it falls back to the old rule of counting
 * through the palette.
 */
export function colorOf(ferry: { id: number; color?: string | null }): FerryColorName {
  if (isFerryColorName(ferry.color)) return ferry.color;
  const index =
    ((ferry.id - 1) % FERRY_COLOR_NAMES.length + FERRY_COLOR_NAMES.length) %
    FERRY_COLOR_NAMES.length;
  return FERRY_COLOR_NAMES[index] ?? "gray";
}

/**
 * Tailwind-safe class fragments for each ferry identity colour.
 *
 * `solid` is the sampled colour, used for the markers, the icons and the
 * seat bars, where the 3 to 1 non text contrast rule applies. `text` is a
 * darker step of the same hue for wherever the colour carries words on a
 * light background, so it clears the 4.5 to 1 text rule. `darkText` is the
 * lighter step used on the dark landing preview card, where the darker step
 * would disappear into the background. `hex` and `textHex` and `darkHex` are
 * the same values for inline styles.
 */
export const FERRY_COLOR_CLASSES: Record<
  FerryColorName,
  {
    solid: string;
    soft: string;
    text: string;
    darkText: string;
    border: string;
    hex: string;
    textHex: string;
    darkHex: string;
    /** The name a passenger reads. Colour is never the only clue. */
    label: string;
  }
> = {
  orange: {
    solid: "bg-ferry-1",
    soft: "bg-orange-50",
    text: "text-ferry-text-1",
    darkText: "text-ferry-dark-1",
    border: "border-ferry-1",
    hex: "#C2611C",
    textHex: "#9C4A0B",
    darkHex: "#F0A868",
    label: "Orange",
  },
  purple: {
    solid: "bg-ferry-2",
    soft: "bg-purple-50",
    text: "text-ferry-text-2",
    darkText: "text-ferry-dark-2",
    border: "border-ferry-2",
    hex: "#7C3AED",
    textHex: "#6D28D9",
    darkHex: "#C4A5FB",
    label: "Purple",
  },
  green: {
    solid: "bg-ferry-3",
    soft: "bg-emerald-50",
    text: "text-ferry-text-3",
    darkText: "text-ferry-dark-3",
    border: "border-ferry-3",
    hex: "#0E9F6E",
    textHex: "#07805A",
    darkHex: "#4ADE9E",
    label: "Green",
  },
  gray: {
    solid: "bg-ferry-4",
    soft: "bg-slate-100",
    text: "text-ferry-text-4",
    darkText: "text-ferry-dark-4",
    border: "border-ferry-4",
    hex: "#64748B",
    textHex: "#556274",
    darkHex: "#CBD5E1",
    label: "Gray",
  },
  blue: {
    solid: "bg-ferry-5",
    soft: "bg-blue-50",
    text: "text-ferry-text-5",
    darkText: "text-ferry-dark-5",
    border: "border-ferry-5",
    hex: "#1D4ED8",
    textHex: "#1E40AF",
    darkHex: "#93C5FD",
    label: "Blue",
  },
  pink: {
    solid: "bg-ferry-6",
    soft: "bg-pink-50",
    text: "text-ferry-text-6",
    darkText: "text-ferry-dark-6",
    border: "border-ferry-6",
    hex: "#BE185D",
    textHex: "#9D174D",
    darkHex: "#F9A8D4",
    label: "Pink",
  },
};

/**
 * Passenger facing labels for the stored status. The stored status stays
 * machine readable, the label stays honest, and the two are never mixed.
 */
export const STATUS_LABELS: Record<FerryStatus, string> = {
  DOCKED: "Docked",
  IN_TRANSIT: "Underway",
  OFFLINE: "Out of service",
};

/** Tailwind classes for the status pill. Status is never colour alone. */
export const STATUS_PILL_CLASSES: Record<FerryStatus, string> = {
  DOCKED: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_TRANSIT: "bg-brand-50 text-brand-700 ring-brand-200",
  OFFLINE: "bg-slate-100 text-slate-600 ring-slate-200",
};

/** Assumed seating for each ferry until the real capacity is confirmed. */
export const FERRY_CAPACITY = 40;

/**
 * Number of ferries on Route A.
 *
 * The live count comes from the API, so the screens do not depend on this
 * number. It is only here for the mock data.
 */
export const FERRY_COUNT = 5;

/** Poll interval in milliseconds. */
export const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_MS ?? 5000);

/** A GPS packet older than this many seconds is treated as stale. */
export const STALE_SECONDS = Number(
  process.env.NEXT_PUBLIC_STALE_SECONDS ?? 60,
);

/**
 * Stations are re-read on the same clock as the ferries.
 *
 * They used to be read every 45 seconds, because a station rarely changes.
 * But the master administrator adds stations from the console, and a passenger
 * looking at the route had to wait up to 45 seconds before a new station
 * appeared on it. Five seconds is the clock the boats already run on, and the
 * answer is cached on the server, so the station PC does not feel the extra
 * asking.
 */
export const STATION_POLL_MS = POLL_MS;

/**
 * Demo acceleration for the mock ferries. 1 keeps the simulation in real
 * time; higher values make the ferries move faster so the diagram is
 * obviously alive during a demo.
 */
export const MOCK_TIME_SCALE = Number(
  process.env.NEXT_PUBLIC_MOCK_TIME_SCALE ?? 4,
);

/** The honest notices that must stay on screen. */
export const SCHEMATIC_NOTE = "Schematic route, not for marine navigation";
export const SEATS_ESTIMATE_NOTE = "Seats are estimates";
