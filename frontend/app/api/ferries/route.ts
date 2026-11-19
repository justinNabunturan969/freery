import { NextResponse } from "next/server";
import { getMockFerries } from "@/lib/mock";
import { normalizeScenario } from "@/lib/fetcher";
import { API_SECRET, PC_API_URL, USE_MOCK } from "@/lib/server-config";
import { ferriesResponseSchema } from "@/lib/types";

/**
 * Public read-only route for ferry positions.
 *
 * The browser never talks to the station PC directly. This route calls the
 * read-only API with the x-api-secret header kept in a server side
 * environment variable, and the answer is held for about a second so the
 * station PC stays protected from the number of people watching, while a
 * ferry the master administrator just added still shows up on the passenger
 * site within a few seconds.
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
    return NextResponse.json(getMockFerries(Date.now(), scenario));
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
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/ferries`, {
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
    const parsed = ferriesResponseSchema.safeParse(payload);
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
