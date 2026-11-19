"use client";

import { formatSpeed } from "@/lib/eta";
import type { FerryView } from "@/lib/ferryView";
import { colorOf, FERRY_COLOR_CLASSES } from "@/lib/constants";
import { StatusPill } from "@/components/ui/StatusPill";
import { FerryMarker } from "./FerryMarker";

/**
 * The mobile ferry list. One card per ferry with the icon, name, route,
 * status pill, seats free, ETA and speed.
 *
 * The identity colour of the boat runs down the left edge of the card, the
 * name is written in that colour and the colour is named beside it, so the
 * boats are easy to tell apart on a small screen.
 */
export function FerryCardList({ views }: { views: FerryView[] }) {
  return (
    <ul className="space-y-3">
      {views.map((view) => {
        const color = FERRY_COLOR_CLASSES[colorOf(view.ferry)];
        return (
          <li
            key={view.ferry.id}
            className="rounded-xl border border-line bg-white p-4 shadow-card"
            style={{ borderLeft: `4px solid ${color.hex}` }}
          >
            <div className="flex items-center gap-3">
              <FerryMarker view={view} size={26} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="text-[15px] font-semibold"
                    style={{ color: color.textHex }}
                  >
                    {view.ferry.name}
                  </p>
                  <span
                    className={`rounded-md px-1.5 py-px text-[11px] font-semibold ${color.soft} ${color.text}`}
                  >
                    {color.label}
                  </span>
                </div>
                <p className="truncate text-[12px] text-ink-muted">
                  {view.ferry.status === "OFFLINE" ? "Not operating" : view.routeLabel}
                </p>
              </div>
              <StatusPill status={view.ferry.status} />
            </div>

            {view.ferry.status === "OFFLINE" ? (
              <p className="mt-3 text-[13px] text-ink-faint">No arrival estimate</p>
            ) : (
              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
                <div>
                  <dt className="text-ink-faint">Seats free</dt>
                  <dd className="mt-0.5 font-semibold text-ink">
                    {view.seatsFree} seats
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-faint">ETA</dt>
                  <dd className="mt-0.5 font-semibold text-ink">
                    {view.staleLabel ?? view.etaText}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Speed</dt>
                  <dd className="mt-0.5 font-semibold text-ink">
                    {formatSpeed(view.ferry.speed)}
                  </dd>
                </div>
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}
