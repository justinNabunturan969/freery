"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { fetchFerries, fetchStations, ferriesUrl, stationsUrl } from "@/lib/fetcher";
import {
  computeFerryViews,
  type FerryView,
  type PositionMap,
} from "@/lib/ferryView";
import { POLL_MS, STATION_POLL_MS } from "@/lib/constants";
import type { MockScenario } from "@/lib/mockScenarios";
import type { FerriesResponse, StationsResponse, Station, Ferry } from "@/lib/types";

export interface TrackingStats {
  /** Ferries that are not Offline. */
  inService: number;
  totalFerries: number;
  /** Sum of the seats free across the in service ferries. */
  seatsAvailable: number;
  /** The ferry with the shortest ETA. */
  nextFerry: FerryView | null;
  /** "2 underway, 1 at a station" */
  inServiceSummary: string;
}

function describeInService(views: FerryView[]): string {
  const underway = views.filter((v) => v.ferry.status === "IN_TRANSIT").length;
  const docked = views.filter((v) => v.ferry.status === "DOCKED").length;

  const parts: string[] = [];
  if (underway) parts.push(`${underway} underway`);
  if (docked) parts.push(`${docked} at a station`);
  return parts.length ? parts.join(", ") : "No ferries in service";
}

export function deriveStats(views: FerryView[]): TrackingStats {
  const inServiceViews = views.filter((view) => view.ferry.status !== "OFFLINE");
  const seatsAvailable = inServiceViews.reduce(
    (total, view) => total + view.ferry.seatsAvailable,
    0,
  );

  const nextFerry =
    inServiceViews
      .filter((view) => view.etaMinutes !== null && view.toStation)
      .sort((a, b) => (a.etaMinutes ?? 0) - (b.etaMinutes ?? 0))[0] ?? null;

  return {
    inService: inServiceViews.length,
    totalFerries: views.length,
    seatsAvailable,
    nextFerry,
    inServiceSummary: describeInService(inServiceViews),
  };
}

/**
 * Everything the page needs to show the live route.
 *
 * The site is one page, so the data is read once and handed to the sections
 * that need it.
 */
export interface TrackingData {
  ferries: Ferry[];
  stations: Station[];
  views: FerryView[];
  stats: TrackingStats;
  servedAt: string | null;
  isLoading: boolean;
  error: unknown;
  offline: boolean;
  retry: () => void;
}

/**
 * Live tracking data.
 *
 * SWR polls /api/ferries about every 5 seconds, refreshes when the visitor
 * comes back to the tab and pauses while the tab is hidden. Stations change
 * rarely, so they refresh far less often.
 */
export function useFerryTracking(scenario: MockScenario): TrackingData {
  const historyRef = useRef<PositionMap>({});

  const {
    data: ferriesData,
    error: ferriesError,
    isLoading: ferriesLoading,
    mutate: mutateFerries,
  } = useSWR<FerriesResponse>(ferriesUrl(scenario), fetchFerries, {
    refreshInterval: POLL_MS,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  const {
    data: stationsData,
    error: stationsError,
    isLoading: stationsLoading,
    mutate: mutateStations,
  } = useSWR<StationsResponse>(stationsUrl(scenario), fetchStations, {
    refreshInterval: STATION_POLL_MS,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  const stations = useMemo(() => stationsData?.stations ?? [], [stationsData]);

  const { views, positions } = useMemo(
    () => computeFerryViews(ferriesData?.ferries ?? [], stations, historyRef.current),
    [ferriesData, stations],
  );

  // Remember where each ferry was, so the next reading can tell whether it is
  // heading up the route or heading back.
  useEffect(() => {
    historyRef.current = positions;
  }, [positions]);

  const stats = useMemo(() => deriveStats(views), [views]);

  const offline = Boolean(
    (ferriesError as { offline?: boolean } | undefined)?.offline,
  );

  return {
    ferries: ferriesData?.ferries ?? [],
    stations,
    views,
    stats,
    servedAt: ferriesData?.servedAt ?? null,
    isLoading: ferriesLoading || stationsLoading,
    error: ferriesError ?? stationsError ?? null,
    offline,
    retry: () => {
      void mutateFerries();
      void mutateStations();
    },
  };
}
