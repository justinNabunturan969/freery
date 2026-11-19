"use client";

import { useSearchParams } from "next/navigation";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { ContactSection } from "@/components/landing/ContactSection";
import { Faq } from "@/components/landing/Faq";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Hero } from "@/components/landing/Hero";
import { HighlightsStrip } from "@/components/landing/HighlightsStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { RoleCards } from "@/components/landing/RoleCards";
import { StationsSection } from "@/components/stations/StationsSection";
import { FerriesSection } from "@/components/tracking/FerriesSection";
import { useFerryTracking } from "@/components/tracking/useFerryTracking";
import { STATION_COUNT } from "@/lib/constants";
import { normalizeScenario } from "@/lib/fetcher";

/**
 * The one page.
 *
 * Everything the site has to say is on this page, and the bar at the top
 * moves the reader from one part of it to another.
 *
 * The live data is read once here and handed to the sections that show it,
 * so the hero, the board and the station details always agree with each
 * other while the ferries move.
 *
 * The mock scenario is read here, on the client, so the page itself stays a
 * static shell. That keeps the page metadata in the document head, where
 * search engines and link previewers look for it.
 */
export function HomeView({ useMock }: { useMock: boolean }) {
  const searchParams = useSearchParams();
  const scenario = normalizeScenario(searchParams.get("scenario"));

  const tracking = useFerryTracking(scenario);
  const stationCount = tracking.stations.length || STATION_COUNT;

  return (
    <>
      <Hero
        useMock={useMock}
        stations={tracking.stations}
        views={tracking.views}
        servedAt={tracking.servedAt}
        loading={tracking.isLoading}
      />
      <HighlightsStrip stationCount={stationCount} />
      <FeatureCards />
      <FerriesSection useMock={useMock} {...tracking} />
      <StationsSection useMock={useMock} {...tracking} />
      <HowItWorks />
      <RoleCards />
      <Faq />
      <ContactSection />
      <ClosingCta />
    </>
  );
}
