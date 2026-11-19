import { NextResponse } from "next/server";
import { getMockStationsResponse } from "@/lib/mock";
import { normalizeScenario } from "@/lib/fetcher";
import { API_SECRET, PC_API_URL, USE_MOCK } from "@/lib/server-config";
import { stationsResponseSchema } from "@/lib/types";

/**
 * Public read-only route for station status. Open or closed state and the
 * station notice come from here, so the Stations page and the Contact us
 * section always show the same live state.
 *
 * The answer is held for a second, so a station the master administrator just
 * added on the console shows up on the passenger site within a few seconds
 * instead of waiting out a longer window.
 */

export const revalidate = 1;

export async function GET(request: Request) {
  const scenario = normalizeScenario(
    new URL(request.url).searchParams.get("scenario"),
  );

  if (USE_MOCK) {
    if (scenario === "offline") {
      return NextResponse.json({ offline: true }, { status: 503 });
    }
    if (scenario === "error") {
      return NextResponse.json(
        { error: "Simulated failure from the station API" },
        { status: 500 },
      );
    }
    return NextResponse.json(getMockStationsResponse(scenario));
  }

  const baseUrl = PC_API_URL;
  const secret = API_SECRET;

  if (!baseUrl || !secret) {
    return NextResponse.json(
      { offline: true, error: "The read-only API is not configured yet" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/stations`, {
      headers: {
        "x-api-secret": secret,
        accept: "application/json",
      },
      next: { revalidate: 1 },
    });

    if (!response.ok) {
      return NextResponse.json({ offline: true }, { status: 503 });
    }

    const payload: unknown = await response.json();
    const parsed = stationsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "The read-only API returned data that does not match the contract",
          issues: parsed.error.issues,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed.data);
  } catch {
    return NextResponse.json({ offline: true }, { status: 503 });
  }
}
