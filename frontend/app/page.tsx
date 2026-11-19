import type { Metadata } from "next";
import { Suspense } from "react";
import { HomeView } from "@/components/landing/HomeView";
import { USE_MOCK } from "@/lib/server-config";

export const metadata: Metadata = {
  title: "Freery - Ferry tracking, made clear",
  description:
    "See where your ferry is, whether it is boarding and how many seats are estimated to be free, before you reach the port.",
};

export default function HomePage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-shell px-4 py-12 sm:px-6" />}>
      <HomeView useMock={USE_MOCK} />
    </Suspense>
  );
}
