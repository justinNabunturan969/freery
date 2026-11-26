"use client";

import { useEffect, useRef, useState } from "react";
import type { FerryView } from "@/lib/ferryView";
import type { Station } from "@/lib/types";
import { SCHEMATIC_NOTE } from "@/lib/constants";
import { getStationContent } from "@/lib/stationContent";
import { useIsMobile } from "@/lib/useMediaQuery";
import { FerryCallout } from "./FerryCallout";
import { FerryMarker } from "./FerryMarker";
import { StationDot } from "./StationDot";

/**
 * The schematic route.
 *
 * Plain SVG and CSS, no map library and no map tiles. The route is a line
 * with evenly spaced station dots, horizontal on desktop and vertical on
 * mobile. Ferry markers sit on the line at the position projected from their
 * reported coordinates.
 *
 * The same component draws the route on the Ferries and Stations pages and
 * in the landing page preview, so the three can never disagree.
 */

/**
 * The name written under a station dot.
 *
 * The real station names are long ("Quinta Market Ferry Terminal") and the
 * label under a dot has only a narrow column, so the long name wraps over
 * three lines and lands on the station below it. The short name is the place
 * name on its own, which is what the survey document calls the station and
 * what people say out loud.
 *
 * The full name is still what the passenger reads in the station details, in
 * the list of stations, and in the accessible name of the dot itself.
 */
function stationLabel(station: Station): string {
  return getStationContent(station.id).shortName ?? station.name;
}

/**
 * The width of the callout card.
 *
 * It is wide enough for the arrival sentence on one line: "Arrives Station 2
 * in 5 min". A longer station name pushes it onto a second line, and the card
 * has room for that.
 */
const CALLOUT_W = 184;

/**
 * The height of one callout card, and the gap between two rows of them.
 *
 * The card holds the arrival message, which is a sentence and sometimes takes
 * two lines, so the row is taller than a single line of text needs.
 */
const CALLOUT_H = 88;
const LEVEL_GAP = 96;
const CALL_OUT_OFFSET = 10;

/** The narrower callout used on dark surfaces. */
const HERO_CALLOUT_W = 138;

/**
 * Push callouts apart when two ferries are close on the line.
 *
 * The callout with the most room takes the next row, so the rows are used
 * evenly. The number of rows is capped: the card keeps the same height
 * whatever the ferries do, so when the rows are full the callout goes into
 * the roomiest one. That only happens when the ferries are on top of each
 * other, where the markers overlap as well.
 */
function packLevels(
  positions: number[],
  minGap: number,
  maxRows: number,
): number[] {
  const order = positions
    .map((x, index) => ({ x, index }))
    .sort((a, b) => a.x - b.x);
  const lastX: number[] = [];
  const result = new Array<number>(positions.length).fill(0);

  for (const { x, index } of order) {
    let best = -1;
    let bestGap = -Infinity;

    for (let row = 0; row < lastX.length; row++) {
      const last = lastX[row];
      if (last === undefined) continue;
      const gap = Math.abs(x - last);
      if (gap >= minGap && gap > bestGap) {
        bestGap = gap;
        best = row;
      }
    }

    if (best === -1 && lastX.length < maxRows) {
      // There is a row free.
      best = lastX.length;
      lastX.push(x);
      result[index] = best;
      continue;
    }

    if (best === -1) {
      // Every row is full. The roomiest one is the best that can be done.
      for (let row = 0; row < lastX.length; row++) {
        const last = lastX[row];
        if (last === undefined) continue;
        const gap = Math.abs(x - last);
        if (gap > bestGap) {
          bestGap = gap;
          best = row;
        }
      }
    }

    lastX[best] = x;
    result[index] = best;
  }

  return result;
}

/** The surface the diagram is drawn on. */
export type RouteTone = "light" | "dark";

/**
 * Track the rendered width of the route plot, so callout spacing can be
 * calculated in pixels instead of as a percentage of an unknown width.
 */
function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => setWidth(element.getBoundingClientRect().width);
    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

function Legend({
  variant,
  tone = "light",
}: {
  variant: "tracking" | "picker";
  tone?: RouteTone;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] ${
        dark ? "text-white/70" : "text-ink-muted"
      }`}
    >
      <div className="flex items-center gap-5">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`inline-block h-[11px] w-[11px] rounded-full border-2 ${
              dark ? "border-[#5C8F94] bg-transparent" : "border-line-strong bg-white"
            }`}
          />
          Station
        </span>
        {variant === "picker" ? (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-[11px] w-[11px] rounded-full border-2 border-brand-500 bg-brand-500"
            />
            Selected station
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-[11px] w-[11px] rounded-full bg-brand-500"
            />
            Ferry in service
          </span>
        )}
      </div>
      <span className={dark ? "text-white/55" : "text-ink-faint"}>
        {SCHEMATIC_NOTE}
      </span>
    </div>
  );
}

export function RouteDiagram({
  stations,
  views,
  orientation = "auto",
  tone = "light",
  selectedStationId = null,
  onSelectStation,
  selectionNote = null,
  loading = false,
}: {
  stations: Station[];
  views: FerryView[];
  /**
   * "auto" follows the screen size: horizontal on desktop, vertical on a
   * phone. Pass "horizontal" or "vertical" to force one of them.
   */
  orientation?: "auto" | "horizontal" | "vertical";
  /** The surface the diagram is drawn on. */
  tone?: RouteTone;
  selectedStationId?: number | null;
  onSelectStation?: (stationId: number) => void;
  selectionNote?: React.ReactNode;
  loading?: boolean;
}) {
  const isMobile = useIsMobile();
  const dark = tone === "dark";
  const placed = views.filter(
    (view) => view.routePosition !== null && view.marker !== "offline",
  );

  const resolved =
    orientation === "auto" ? (isMobile ? "vertical" : "horizontal") : orientation;

  // Dark surfaces use the narrower callout.
  const calloutWidth = dark ? HERO_CALLOUT_W : CALLOUT_W;

  if (loading) {
    return (
      <div
        className={`rounded-xl p-5 ${
          dark ? "bg-white/5" : "bg-brand-50"
        }`}
      >
        <div
          className={`h-[120px] animate-pulse rounded-lg ${
            dark ? "bg-white/10" : "bg-white/70"
          }`}
        />
      </div>
    );
  }

  if (resolved === "vertical") {
    return (
      <div
        className={`rounded-xl p-4 sm:p-5 ${dark ? "bg-white/5" : "bg-brand-50"}`}
      >
        {selectionNote}
        <VerticalDiagram
          stations={stations}
          views={placed}
          selectedStationId={selectedStationId}
          onSelectStation={onSelectStation}
          tone={tone}
          calloutWidth={calloutWidth}
        />
        <Legend variant={onSelectStation ? "picker" : "tracking"} tone={tone} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-5 ${dark ? "bg-white/5" : "bg-brand-50"}`}
    >
      {selectionNote}
      <HorizontalDiagram
        stations={stations}
        views={placed}
        selectedStationId={selectedStationId}
        onSelectStation={onSelectStation}
        tone={tone}
        calloutWidth={calloutWidth}
      />
      <Legend variant={onSelectStation ? "picker" : "tracking"} tone={tone} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Desktop: horizontal route                                                  */
/* -------------------------------------------------------------------------- */

function HorizontalDiagram({
  stations,
  views,
  selectedStationId,
  onSelectStation,
  tone,
  calloutWidth,
}: {
  stations: Station[];
  views: FerryView[];
  selectedStationId: number | null;
  onSelectStation?: (stationId: number) => void;
  tone: RouteTone;
  calloutWidth: number;
}) {
  const dark = tone === "dark";
  const count = stations.length;
  const [plotRef, plotWidth] = useMeasuredWidth<HTMLDivElement>();
  const positions = views.map((view) => (view.routePosition ?? 0) * 100);

  // Callouts have a fixed width, so their centres need that much room in
  // pixels. Before the first measurement, fall back to the percentage rule.
  const measured = plotWidth > 0;
  const halfCallout = Math.min(calloutWidth, plotWidth) / 2;
  const centers = views.map((view) => {
    const raw = (view.routePosition ?? 0) * plotWidth;
    return Math.max(halfCallout, Math.min(plotWidth - halfCallout, raw));
  });

  /**
   * The number of callout rows is taken from the size of the fleet, not from
   * where the ferries happen to be at this moment. Otherwise the card grows
   * and shrinks as the boats move, and the whole page moves under the
   * reader who is trying to read it.
   */
  const reservedRows = Math.max(1, Math.ceil(views.length / 2));

  const levels = measured
    ? packLevels(centers, calloutWidth + 12, reservedRows)
    : packLevels(positions, 16, reservedRows);

  const lineY = CALL_OUT_OFFSET + (reservedRows - 1) * LEVEL_GAP + CALLOUT_H + 14;
  const height = lineY + 56;
  const linePercent = (lineY / height) * 100;

  return (
    <div className="px-8">
      <div ref={plotRef} className="relative" style={{ height }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d={`M0 ${linePercent} H100`}
            className={dark ? "route-line-dark" : "route-line"}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {stations.map((station, index) => (
          <span
            key={`label-${station.id}`}
            className={`pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[11px] ${
              dark ? "text-white/70" : "text-ink-muted"
            }`}
            style={{
              left: `${(index / Math.max(1, count - 1)) * 100}%`,
              top: lineY + 20,
            }}
          >
            {stationLabel(station)}
          </span>
        ))}

        {stations.map((station, index) => (
          <StationDot
            key={`dot-${station.id}`}
            station={station}
            index={index}
            count={count}
            selected={selectedStationId === station.id}
            onSelect={onSelectStation}
            top={lineY}
            tone={tone}
            className="-translate-x-1/2 -translate-y-1/2"
          />
        ))}

        {views.map((view, index) => (
          <div
            key={`marker-${view.ferry.id}`}
            className="ferry-marker pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${positions[index] ?? 0}%`, top: lineY }}
          >
            <FerryMarker view={view} />
          </div>
        ))}

        {views.map((view, index) => {
          const level = levels[index] ?? 0;
          const position = positions[index] ?? 0;
          const center = centers[index] ?? 0;
          return (
            <div
              key={`callout-${view.ferry.id}`}
              className="absolute z-20"
              style={{
                left: measured
                  ? `${center}px`
                  : `clamp(${calloutWidth / 2}px, ${position}%, calc(100% - ${calloutWidth / 2}px))`,
                top: CALL_OUT_OFFSET + level * LEVEL_GAP,
                transform: "translateX(-50%)",
              }}
            >
              <FerryCallout view={view} width={calloutWidth} tone={tone} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile: vertical route                                                     */
/* -------------------------------------------------------------------------- */

const ROW_H = 54;
/**
 * Where the vertical line sits, measured from the left edge.
 *
 * It is far enough across to hold a station name. The column to the left of
 * the line is the name, and it has to be wide enough for the longest one,
 * otherwise the name wraps over three lines and lands on the station below.
 */
const LINE_X = 104;

function VerticalDiagram({
  stations,
  views,
  selectedStationId,
  onSelectStation,
  tone,
  calloutWidth,
}: {
  stations: Station[];
  views: FerryView[];
  selectedStationId: number | null;
  onSelectStation?: (stationId: number) => void;
  tone: RouteTone;
  calloutWidth: number;
}) {
  const dark = tone === "dark";
  const count = stations.length;
  const span = Math.max(1, count - 1);
  const height = span * ROW_H + 40;

  // Keep the callouts from sitting on top of each other.
  const placed = views
    .map((view) => ({
      view,
      top: ((view.routePosition ?? 0) * span * ROW_H + 20) - CALLOUT_H / 2,
    }))
    .sort((a, b) => a.top - b.top);

  let lastBottom = -Infinity;
  for (const item of placed) {
    if (item.top < lastBottom) item.top = lastBottom + 8;
    lastBottom = item.top + CALLOUT_H;
  }

  return (
    <div className="relative" style={{ height }}>
      {/*
        The vertical line.

        The height has to be given to the element itself. An svg carries an
        intrinsic ratio, so with an automatic height it would take the height
        of its own width and the line would stop a short way down the route.
      */}
      <svg
        className="absolute"
        style={{ left: LINE_X - 1.5, width: 3, height: "100%" }}
        viewBox="0 0 3 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M1.5 0 V100"
          className={dark ? "route-line-dark" : "route-line"}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {stations.map((station, index) => (
        <span
          key={`label-${station.id}`}
          className={`pointer-events-none absolute text-[12px] leading-tight ${
            dark ? "text-white/70" : "text-ink-muted"
          }`}
          style={{
            top: index * ROW_H + 13,
            left: 0,
            width: LINE_X - 18,
            textAlign: "right",
          }}
        >
          {stationLabel(station)}
        </span>
      ))}

      {stations.map((station, index) => (
        <StationDot
          key={`dot-${station.id}`}
          station={station}
          index={index}
          count={count}
          selected={selectedStationId === station.id}
          onSelect={onSelectStation}
          top={index * ROW_H + 20}
          left={LINE_X}
          tone={tone}
          className="-translate-x-1/2 -translate-y-1/2"
        />
      ))}

      {views.map((view) => (
        <div
          key={`marker-${view.ferry.id}`}
          className="ferry-marker pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: LINE_X,
            top: ((view.routePosition ?? 0) * span * ROW_H + 20),
          }}
        >
          <FerryMarker view={view} size={22} />
        </div>
      ))}

      {placed.map((item) => (
        <div
          key={`callout-${item.view.ferry.id}`}
          className="absolute z-20"
          style={{ left: LINE_X + 22, right: 0, top: item.top }}
        >
          <FerryCallout
            view={item.view}
            tone={tone}
            width={calloutWidth < CALLOUT_W ? undefined : calloutWidth}
          />
        </div>
      ))}
    </div>
  );
}
