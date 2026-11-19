"use client";

/**
 * The route selector. There is only one route in this prototype, so it shows
 * Route A and the stops on it. Choosing something never triggers a server
 * request.
 */
export function RouteSelector({
  className = "",
  stationCount = 8,
}: {
  className?: string;
  /** How many stops the route has right now. */
  stationCount?: number;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="sr-only">Route</span>
      <select
        defaultValue="route-a"
        aria-label="Route"
        className="min-h-[44px] w-full appearance-none rounded-lg border border-line bg-white px-3 pr-8 text-[13px] font-medium text-ink shadow-card focus:border-brand-400 focus:outline-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%235B6E7C'%3E%3Cpath fill-rule='evenodd' d='M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
          backgroundSize: "18px 18px",
        }}
      >
        <option value="route-a">Route A · Stations 1-{stationCount}</option>
      </select>
    </label>
  );
}
