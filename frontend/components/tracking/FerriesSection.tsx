"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FerryCardList } from "@/components/tracking/FerryCardList";
import { FerryTable } from "@/components/tracking/FerryTable";
import type { TrackingData } from "@/components/tracking/useFerryTracking";
import { ExampleDataChip } from "@/components/ui/ExampleDataChip";
import { InfoStrip } from "@/components/ui/InfoStrip";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { StatCard } from "@/components/ui/StatCard";
import { ClockIcon, FerryIcon, RefreshIcon, UsersIcon } from "@/components/ui/icons";
import { ROUTE_NAME, STATION_COUNT } from "@/lib/constants";
import { useStoredChoice } from "@/lib/useStoredChoice";

/**
 * The live tracking board.
 *
 * This is a section of the one page, so the data is handed to it rather than
 * read here. Reading it twice would give two different answers while the
 * ferries move.
 */
export function FerriesSection({
  useMock,
  stations,
  views,
  stats,
  isLoading,
  error,
  offline,
  retry,
}: TrackingData & { useMock: boolean }) {
  const [panel, setPanel] = useStoredChoice<"ferries" | "stations">(
    "freery:panel",
    "ferries",
  );

  const nextFerry = stats.nextFerry;
  const nextFerryStation = nextFerry?.toStation?.name ?? null;

  const infoItems = useMemo(
    () => [
      {
        title: "Choose your station",
        detail: nextFerryStation
          ? `${nextFerryStation} · Next arrival in ${nextFerry?.etaText}`
          : "No arrival estimate available",
      },
      {
        title: "Seats are estimates",
        detail: "Availability can change as passengers board.",
      },
      {
        title: "Last received is not always current",
        detail: "Check station notices before boarding.",
      },
    ],
    [nextFerryStation, nextFerry?.etaText],
  );

  return (
    <section
      id="ferries"
      tabIndex={-1}
      className="scroll-mt-[96px] bg-white py-12 sm:py-14"
    >
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        <PageHeader
          title="Your next ferry, at a glance."
          subtitle="Follow ferry locations and check estimated seats before boarding."
          stationCount={stations.length || STATION_COUNT}
        >
          {useMock ? <ExampleDataChip /> : null}
        </PageHeader>

        {offline ? (
          <OfflineBanner className="mt-6" />
        ) : error ? (
          <div
            role="alert"
            className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-[13px] font-medium text-red-900">
              We could not load the ferry data. Please try again.
            </p>
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-red-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-800"
            >
              <RefreshIcon className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Ferries in service"
            value={
              isLoading ? "—" : `${stats.inService} / ${stats.totalFerries}`
            }
            hint={stats.inServiceSummary}
            icon={<FerryIcon className="h-6 w-6" />}
            loading={isLoading}
          />
          <StatCard
            label="Seats available"
            value={isLoading ? "—" : stats.seatsAvailable}
            hint="across operating ferries"
            icon={<UsersIcon className="h-6 w-6" />}
            loading={isLoading}
          />
          <StatCard
            label="Next ferry"
            value={isLoading ? "—" : (nextFerry?.etaText ?? "—")}
            hint={
              nextFerry && nextFerryStation
                ? `${nextFerry.ferry.name} to ${nextFerryStation}`
                : "No arrival estimate available"
            }
            icon={<ClockIcon className="h-6 w-6" />}
            loading={isLoading}
          />
        </div>

        <div className="mt-6 rounded-xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink-strong">
                Find your ferry
              </h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                Last updates for every ferry on {ROUTE_NAME}.
              </p>
            </div>

            <div
              role="group"
              aria-label="Choose a list"
              className="inline-flex rounded-lg border border-line bg-page p-1"
            >
              {(["ferries", "stations"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPanel(option)}
                  aria-pressed={panel === option}
                  className={`min-h-[36px] rounded-md px-3.5 text-[13px] font-medium capitalize transition-colors ${
                    panel === option
                      ? "bg-white text-ink shadow-card"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {panel === "ferries" ? (
              <>
                <div className="hidden md:block">
                  <FerryTable views={views} />
                </div>
                <div className="md:hidden">
                  <FerryCardList views={views} />
                </div>
                <p className="mt-3 text-[12px] text-ink-faint">
                  Seat estimates are updated by station staff.
                </p>
              </>
            ) : (
              <StationsPanel stations={stations} views={views} />
            )}
          </div>
        </div>

        <div className="mt-6">
          <InfoStrip
            title="Travel with a little more certainty."
            items={infoItems}
          />
        </div>

        {/* Mobile only */}
        <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5 md:hidden">
          <h2 className="text-[16px] font-semibold text-ink-strong">
            Before you board
          </h2>
          <p className="mt-1.5 text-[13px] font-medium text-ink">
            {nextFerryStation
              ? `${nextFerryStation} · Next ferry in ${nextFerry?.etaText}`
              : "No arrival estimate available"}
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] text-ink-muted">
            <li>Seats are estimates from station staff.</li>
            <li>Availability may change during boarding.</li>
            <li>
              Check station notices for the latest operating information.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function StationsPanel({
  stations,
  views,
}: {
  stations: import("@/lib/types").Station[];
  views: import("@/lib/ferryView").FerryView[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-page/60">
            <th
              scope="col"
              className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint"
            >
              Station
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint"
            >
              Next arrival
            </th>
          </tr>
        </thead>
        <tbody>
          {stations.map((station) => {
            const next = views
              .filter(
                (view) =>
                  view.toStation?.id === station.id && view.etaMinutes !== null,
              )
              .sort((a, b) => (a.etaMinutes ?? 0) - (b.etaMinutes ?? 0))[0];
            return (
              <tr key={station.id} className="border-b border-line last:border-b-0">
                <th
                  scope="row"
                  className="px-4 py-3.5 text-[14px] font-medium text-ink"
                >
                  {station.name}
                </th>
                <td className="px-4 py-3.5 text-[13px]">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      station.isOpen ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        station.isOpen ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {station.isOpen ? "Open" : "Closed"}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[13px] text-ink">
                  {next ? `${next.ferry.name} in ${next.etaText}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
