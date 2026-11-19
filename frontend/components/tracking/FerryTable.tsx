"use client";

import { formatSpeed } from "@/lib/eta";
import type { FerryView } from "@/lib/ferryView";
import { colorOf, FERRY_COLOR_CLASSES } from "@/lib/constants";
import { SeatBar } from "@/components/ui/SeatBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { FerryMarker } from "./FerryMarker";

/**
 * The desktop ferry list. One row per ferry with its status, route, speed,
 * next arrival and a seat bar.
 *
 * The identity colour of the boat runs down the left edge of the row, the
 * name is written in that colour and the colour is named beside it. A
 * passenger can tell the boats apart without reading a single number, and
 * the colour is never the only clue, because the name is always there too.
 */
export function FerryTable({ views }: { views: FerryView[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-page/60">
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Ferry
            </th>
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Route
            </th>
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Speed
            </th>
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Next arrival
            </th>
            <th scope="col" className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Seats available
            </th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => {
            const color = FERRY_COLOR_CLASSES[colorOf(view.ferry)];
            return (
              <tr
                key={view.ferry.id}
                className="border-b border-line last:border-b-0 hover:bg-page/40"
              >
                <th
                  scope="row"
                  className="px-4 py-3.5 font-normal"
                  style={{ borderLeft: `4px solid ${color.hex}` }}
                >
                  <span className="flex items-center gap-2.5">
                    <FerryMarker view={view} size={22} />
                    <span className="flex flex-col gap-0.5">
                      <span
                        className="text-[14px] font-semibold"
                        style={{ color: color.textHex }}
                      >
                        {view.ferry.name}
                      </span>
                      <span
                        className={`w-fit rounded-md px-1.5 py-px text-[11px] font-semibold ${color.soft} ${color.text}`}
                      >
                        {color.label}
                      </span>
                    </span>
                  </span>
                </th>
                <td className="px-4 py-3.5">
                  <StatusPill status={view.ferry.status} />
                </td>
                <td className="px-4 py-3.5 text-[13px] text-ink">
                  {view.ferry.status === "OFFLINE" ? "Not operating" : view.routeLabel}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-ink">
                  {view.ferry.status === "OFFLINE" ? "—" : formatSpeed(view.ferry.speed)}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-ink">
                  {view.ferry.status === "OFFLINE"
                    ? "—"
                    : (view.staleLabel ?? view.etaText)}
                </td>
                <td className="px-4 py-3.5">
                  {view.ferry.status === "OFFLINE" ? (
                    <span className="text-[13px] text-ink-faint">Unavailable</span>
                  ) : (
                    <SeatBar
                      seatsAvailable={view.seatsFree}
                      capacity={view.ferry.capacity}
                      ferry={view.ferry}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
