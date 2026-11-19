import { STALE_SECONDS } from "./constants";

/**
 * Freshness rules (section 4.4 of the brief).
 *
 *   live    the last packet is 60 seconds old or less
 *   stale   the last packet is older than 60 seconds
 *   offline the ferry is out of service, or the station cannot be reached
 *
 * The 60 second limit is a starting value. Adjust it after the real packet
 * interval is known.
 */

export type Freshness = "live" | "stale" | "offline" | "unknown";

export function ageSeconds(
  receivedAt: string | null,
  now: number = Date.now(),
): number | null {
  if (!receivedAt) return null;
  const parsed = Date.parse(receivedAt);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.round((now - parsed) / 1000));
}

export function freshnessOf(
  receivedAt: string | null,
  now: number = Date.now(),
  staleSeconds: number = STALE_SECONDS,
): Freshness {
  const age = ageSeconds(receivedAt, now);
  if (age === null) return "unknown";
  return age > staleSeconds ? "stale" : "live";
}

/** "just now", "3 min ago", "1 hr 12 min ago". */
export function describeAge(seconds: number | null): string {
  if (seconds === null) return "unknown";
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr ago` : `${hours} hr ${rest} min ago`;
}

/**
 * The same age in the short form, for the narrow callout card.
 *
 * "4 hr 17 min" instead of "4 hr 17 min ago". The card already says "Last
 * seen", so the extra three characters were only pushing the text out of the
 * card. The full wording stays where there is room for it, in the ferry table
 * and the mobile cards.
 */
export function describeAgeShort(seconds: number | null): string {
  if (seconds === null) return "unknown";
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** Marker styling for a ferry on the route diagram. */
export function markerState(
  status: string,
  receivedAt: string | null,
  now: number = Date.now(),
  staleSeconds: number = STALE_SECONDS,
): "normal" | "stale" | "offline" {
  if (status === "OFFLINE") return "offline";
  if (freshnessOf(receivedAt, now, staleSeconds) === "stale") return "stale";
  return "normal";
}
