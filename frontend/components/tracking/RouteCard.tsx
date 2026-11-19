"use client";

import { LastUpdated } from "@/components/ui/LastUpdated";
import { ROUTE_NAME } from "@/lib/constants";
import type { FerryView } from "@/lib/ferryView";
import type { Station } from "@/lib/types";
import { RouteDiagram } from "./RouteDiagram";

/**
 * The live route card. The Ferries tab and the landing page preview both
 * render this component, so the route diagram, the ferry markers and the
 * callouts look and behave the same in both places.
 */
export function RouteCard({
  stations,
  views,
  servedAt,
  useMock = false,
  loading = false,
  title = `${ROUTE_NAME} · Ferry tracking`,
  subtitle = "Latest reported ferry positions",
}: {
  stations: Station[];
  views: FerryView[];
  servedAt: string | null;
  useMock?: boolean;
  loading?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink-strong">
            {title}
          </h2>
          <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>
        </div>
        <LastUpdated
          timestamp={servedAt}
          note={useMock ? "Example route" : undefined}
        />
      </div>

      <div className="mt-4">
        <RouteDiagram stations={stations} views={views} loading={loading} />
      </div>
    </section>
  );
}
