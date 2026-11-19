"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { StationDetail } from "@/components/stations/StationDetail";
import { RouteDiagram } from "@/components/tracking/RouteDiagram";
import type { TrackingData } from "@/components/tracking/useFerryTracking";
import { ExampleDataChip } from "@/components/ui/ExampleDataChip";
import { LastUpdated } from "@/components/ui/LastUpdated";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { ROUTE_NAME, STATION_COUNT } from "@/lib/constants";

/**
 * The stations section of the one page.
 *
 * The route diagram and the station details are here. The counts and the
 * notices live in the ferries section above, so they are not repeated.
 */
export function StationsSection({
  useMock,
  stations,
  views,
  servedAt,
  isLoading,
}: TrackingData & { useMock: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const detailsRef = useRef<HTMLDivElement | null>(null);
  const chosen = useRef(false);

  const urlStation = Number(searchParams.get("station"));
  const [selectedId, setSelectedId] = useState<number>(
    Number.isFinite(urlStation) && urlStation > 0 ? urlStation : 1,
  );

  const selected =
    stations.find((station) => station.id === selectedId) ?? stations[0] ?? null;

  const selectStation = useCallback((stationId: number) => {
    chosen.current = true;
    setSelectedId(stationId);
    // On mobile, selecting a dot scrolls to the details panel.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      window.setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }, []);

  /**
   * Keep the choice in the address, so the section can be shared and opened on
   * the same station.
   *
   * The address is only written once the reader has chosen a station. A page
   * that is simply opened does not carry a station in its address, and it
   * does not land half way down the page.
   */
  useEffect(() => {
    if (!chosen.current) return;
    const current = searchParams.get("station");
    if (current === String(selectedId)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("station", String(selectedId));
    router.replace(`/?${params.toString()}`, { scroll: false });
  }, [selectedId, router, searchParams]);

  return (
    <section
      id="stations"
      tabIndex={-1}
      className="scroll-mt-[96px] bg-page py-12 sm:py-14"
    >
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        <PageHeader
          title="Your station, before you board."
          subtitle="Explore station details, boarding information and directions along the route."
          showRoute={false}
          stationCount={stations.length || STATION_COUNT}
        >
          {useMock ? <ExampleDataChip /> : null}
        </PageHeader>

        <div className="mt-6 rounded-xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink-strong">
                {ROUTE_NAME} · Find a station
              </h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                Tap a station to view its details below
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <LastUpdated
                timestamp={servedAt}
                note={useMock ? "Example route" : undefined}
              />
              <PlaceholderBadge label="Placeholder stations" />
            </div>
          </div>

          <div className="mt-4">
            <RouteDiagram
              stations={stations}
              views={views}
              selectedStationId={selected?.id ?? null}
              onSelectStation={selectStation}
              selectionNote={
                selected ? (
                  <p className="mb-3 flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-[12px] font-medium text-brand-700">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-brand-500"
                      aria-hidden="true"
                    />
                    {selected.name} selected - details below
                  </p>
                ) : null
              }
              loading={isLoading}
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-ink-strong">
              Find your station
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Tap a dot on the route to see details, photos and location.
            </p>
          </div>

          <div ref={detailsRef} className="mt-6">
            {selected ? (
              <StationDetail
                station={selected}
                ferryViews={views}
                routePosition={selected.order}
                stationCount={stations.length || STATION_COUNT}
              />
            ) : (
              <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
