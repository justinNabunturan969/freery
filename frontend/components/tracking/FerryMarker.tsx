import { colorOf, FERRY_COLOR_CLASSES } from "@/lib/constants";
import type { FerryView } from "@/lib/ferryView";

/**
 * A ferry sitting on the route line. The marker keeps the ferry identity
 * colour; a stale ferry gets an amber ring so the state is never colour
 * alone.
 */
export function FerryMarker({
  view,
  size = 26,
  className = "",
}: {
  view: FerryView;
  size?: number;
  className?: string;
}) {
  const color = FERRY_COLOR_CLASSES[colorOf(view.ferry)];
  const stale = view.marker === "stale";

  return (
    <span
      className={`flex items-center justify-center rounded-full text-white shadow-chip ${color.solid} ${
        stale ? "ring-2 ring-amber-400 ring-offset-2" : ""
      } ${className}`}
      style={{ width: size, height: size }}
      title={view.staleLabel ?? `${view.ferry.name} · ${view.routeLabel || "On the route"}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.62, height: size * 0.62 }}
      >
        <path d="M4 15V9l8-3 8 3v6" />
        <path d="M4 12h16" />
        <path d="M3 18c1.4 0 1.4-1.3 2.8-1.3S7.2 18 8.6 18s1.4-1.3 2.8-1.3 1.4 1.3 2.8 1.3 1.4-1.3 2.8-1.3S18.6 18 20 18s1.4-1.3 2.8-1.3" />
      </svg>
    </span>
  );
}
