"use client";

import { useState } from "react";
import { STATION_LIST, getStationContent } from "@/lib/stationContent";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { ContactRow } from "@/components/ui/ContactRow";
import { LinkIcon, MailIcon, PhoneIcon } from "@/components/ui/icons";

/**
 * The Contact us section. It uses the same stations and the same static
 * station content as the Stations page, so the names on screen are the real
 * station names. A missing contact value is shown as pending.
 */
export function ContactSection() {
  const [selected, setSelected] = useState(1);
  const content = getStationContent(selected);
  const station = STATION_LIST.find((row) => row.id === selected);
  const stationName = station?.name ?? `Station ${selected}`;

  return (
    <section
      id="contact"
      tabIndex={-1}
      className="scroll-mt-[96px] bg-brand-50 py-14 sm:py-16"
    >
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
          Contact us
        </p>
        <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-ink-strong sm:text-[32px]">
          Your station.
          <br />
          Your support team.
        </h2>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-muted">
          Ask about boarding, accessibility, or route questions, or any other
          station information. Contact the right team directly.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[13px] font-semibold text-ink">Choose your station</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {STATION_LIST.map((row) => {
                const active = row.id === selected;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelected(row.id)}
                    aria-pressed={active}
                    className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-colors ${
                      active
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase tracking-wide ${
                        active ? "text-white/75" : "text-ink-faint"
                      }`}
                    >
                      Stop {row.id}
                    </span>
                    <span className="text-[13px] font-semibold leading-tight">
                      {row.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[12px] text-ink-faint">
              Station photos and support lines are pulled from the station
              details.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 shadow-card sm:p-6">
            <h3 className="text-[16px] font-semibold text-ink-strong">
              {stationName} personnel
            </h3>
            <p className="mt-1 text-[12px] text-ink-muted">
              Station staff for {stationName}. Reach them for any station
              support.
            </p>

            <div className="mt-3">
              <PlaceholderBadge
                label="Contact details pending"
                title="The station is real. Its phone number, email address and social link have not been published yet."
              />
            </div>

            <div className="mt-5 space-y-4">
              <ContactRow
                icon={PhoneIcon}
                label="Mobile number"
                value={content.contact.mobile}
              />
              <ContactRow
                icon={MailIcon}
                label="Email address"
                value={content.contact.email}
              />
              <ContactRow
                icon={LinkIcon}
                label="Social link"
                value={content.contact.social}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
