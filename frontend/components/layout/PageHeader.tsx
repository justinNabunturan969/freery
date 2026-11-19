"use client";

import { useEffect, useState } from "react";
import { formatFullDateTime } from "@/components/ui/LastUpdated";
import { RouteSelector } from "@/components/layout/RouteSelector";

/**
 * Page header shared by the Ferries and Stations pages: the title, the
 * subtext, and on the right the route selector with the current date and time.
 */
export function PageHeader({
  title,
  subtitle,
  showRoute = true,
  stationCount,
  children,
}: {
  title: string;
  subtitle: string;
  showRoute?: boolean;
  /** How many stops the route has right now. */
  stationCount?: number;
  children?: React.ReactNode;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink-strong sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted sm:text-[15px]">
          {subtitle}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
        {showRoute ? (
          <div className="w-full sm:w-[230px]">
            <RouteSelector stationCount={stationCount} />
          </div>
        ) : null}
        {children}
        <p className="text-[12px] text-ink-muted">{now ? formatFullDateTime(now) : " "}</p>
      </div>
    </div>
  );
}
