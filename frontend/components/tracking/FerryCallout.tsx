import { colorOf, FERRY_COLOR_CLASSES } from "@/lib/constants";
import { formatSpeed } from "@/lib/eta";
import type { FerryView } from "@/lib/ferryView";

/**
 * The small card that sits next to a ferry on the route: name, speed, next
 * station with ETA, and how many seats are free.
 *
 * It is used on the light route card and on the dark landing preview, so it
 * takes the surface it sits on.
 */
export function FerryCallout({
  view,
  width,
  tone = "light",
  className = "",
}: {
  view: FerryView;
  /** Fixed width in pixels. Leave it out to fill the space the parent gives. */
  width?: number;
  /** "light" for the white route card, "dark" for the landing preview. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const color = FERRY_COLOR_CLASSES[colorOf(view.ferry)];
  const dark = tone === "dark";

  return (
    <div
      className={`rounded-lg border px-3 py-2 shadow-chip ${
        dark
          ? "border-white/15 bg-white/10"
          : "border-line bg-white"
      } ${className}`}
      style={{
        ...(width ? { width } : {}),
        borderLeftWidth: 3,
        borderLeftColor: color.hex,
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="text-[12px] font-bold leading-none"
          style={{ color: dark ? color.darkHex : color.textHex }}
        >
          {view.ferry.name}
        </span>
        <span
          className={`whitespace-nowrap text-[11px] ${
            dark ? "text-white/70" : "text-ink-muted"
          }`}
        >
          {formatSpeed(view.ferry.speed)}
        </span>
      </div>
      {/*
        The arrival message. This is what the trip status used to be: an
        administrator typed in "boarding" or "delayed" by hand, and the
        passenger was shown it as if it were true. Now the message is worked
        out from the boat's own packets and it says when the boat is due.
      */}
      <p
        className={`mt-1.5 line-clamp-2 text-[12px] font-semibold leading-tight ${
          dark ? "text-white" : "text-ink-strong"
        }`}
      >
        {view.arrivalLabel}
      </p>
      <p
        className={`mt-0.5 text-[11px] leading-tight ${
          dark ? "text-white/70" : "text-ink-muted"
        }`}
      >
        {view.seatsLabel}
      </p>
    </div>
  );
}
