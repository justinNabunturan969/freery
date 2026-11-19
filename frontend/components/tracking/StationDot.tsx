import type { CSSProperties } from "react";
import type { Station } from "@/lib/types";
import type { RouteTone } from "./RouteDiagram";

/**
 * A station dot on the route diagram.
 *
 * The drawn dot is small, but the tap area is at least 44 px. Each dot is a
 * real button with a label, so it works with touch, mouse and keyboard.
 */
export function StationDot({
  station,
  index,
  count,
  selected,
  onSelect,
  top,
  left,
  tone = "light",
  className = "",
}: {
  station: Station;
  index: number;
  count: number;
  selected: boolean;
  onSelect?: (stationId: number) => void;
  /** Vertical offset in pixels. */
  top?: number;
  /** Horizontal offset in pixels. Used by the vertical diagram. */
  left?: number;
  /** The surface the dot is drawn on. */
  tone?: RouteTone;
  className?: string;
}) {
  const dark = tone === "dark";
  const position = count > 1 ? (index / (count - 1)) * 100 : 50;
  const name = station.name || `Station ${index + 1}`;
  const label = selected
    ? `${name} selected, details below`
    : `${name}, ${station.isOpen ? "open" : "closed"}`;

  const style: CSSProperties = {};
  style.left = left === undefined ? `${position}%` : `${left}px`;
  if (top !== undefined) style.top = `${top}px`;

  const dot = (
    <span
      aria-hidden="true"
      className={`block h-[13px] w-[13px] rounded-full border-[2.5px] transition-colors ${
        selected
          ? "border-brand-500 bg-brand-500"
          : station.isOpen
            ? dark
              ? "border-[#5C8F94] bg-transparent"
              : "border-line-strong bg-white"
            : dark
              ? "border-slate-500 bg-transparent"
              : "border-slate-300 bg-slate-100"
      }`}
    />
  );

  if (!onSelect) {
    return (
      <div
        className={`pointer-events-none absolute flex h-11 w-11 items-center justify-center ${className}`}
        style={style}
        title={name}
      >
        {dot}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(station.id)}
      aria-label={label}
      aria-pressed={selected}
      title={name}
      className={`absolute flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 ${className}`}
      style={style}
    >
      {dot}
    </button>
  );
}
