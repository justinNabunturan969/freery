"use client";

import { useEffect, useRef, useState } from "react";
import { STATION_LIST } from "@/lib/stationContent";
import {
  ChevronDownIcon,
  ExternalIcon,
  MapPinIcon,
} from "@/components/ui/icons";

/**
 * The button that holds the stations.
 *
 * It shows the station that is on the screen, and pressing it opens the list
 * of all eight. Picking one from the list changes the station on the screen,
 * and the link beside each one opens that station's exact place on Google
 * Maps.
 *
 * Everything about a station is on one page now: the button, the list and the
 * details underneath it. A passenger who wants to know where Escolta is, or
 * how to get to Guadalupe, does not have to tap a dot on the diagram first.
 *
 * The list closes when a station is picked, when the reader clicks somewhere
 * else, or when they press Escape.
 */
export function StationPicker({
  selectedId,
  onSelect,
}: {
  /** The station that is on the screen now. */
  selectedId: number | null;
  /** Called with the station that was picked. */
  onSelect: (stationId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const selected = STATION_LIST.find((row) => row.id === selectedId) ?? null;

  /* Clicking anywhere else closes the list. */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const wrap = wrapRef.current;
      if (wrap && !wrap.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const pick = (stationId: number) => {
    onSelect(stationId);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-line-strong bg-white px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
      >
        <span className="text-brand-500" aria-hidden="true">
          <MapPinIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wide text-ink-faint">
            {selected ? `Stop ${selected.id} of ${STATION_LIST.length}` : "Choose a station"}
          </span>
          <span className="block truncate text-[16px] font-semibold text-ink-strong">
            {selected ? selected.name : "Pick a station to see its details"}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-ink-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-chip">
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {STATION_LIST.map((station) => {
              const isSelected = station.id === selectedId;
              return (
                <li key={station.id} className="flex items-stretch gap-2 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => pick(station.id)}
                    aria-current={isSelected ? "true" : undefined}
                    className={`min-h-[44px] min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      isSelected
                        ? "bg-brand-50 text-brand-800"
                        : "text-ink hover:bg-brand-50"
                    }`}
                  >
                    <span className="block text-[10px] uppercase tracking-wide text-ink-faint">
                      Stop {station.id}
                    </span>
                    <span className="block truncate text-[14px] font-semibold">
                      {station.name}
                    </span>
                    <span className="block truncate text-[12px] text-ink-muted">
                      Nearest landmark: {station.landmark}
                    </span>
                  </button>
                  <a
                    href={station.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] shrink-0 items-center gap-1 self-center rounded-lg px-2 text-[12px] font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 transition-colors hover:text-brand-600"
                  >
                    See on Google Map
                    <ExternalIcon className="h-3.5 w-3.5" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
