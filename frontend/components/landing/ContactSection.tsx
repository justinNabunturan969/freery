"use client";

import { useState } from "react";
import { getStationContent } from "@/lib/stationContent";
import { PlaceholderBadge } from "@/components/ui/PlaceholderBadge";
import { LinkIcon, MailIcon, PhoneIcon } from "@/components/ui/icons";

const STATION_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PhoneIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-brand-400" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
        {value ? (
          <a
            href={
              label === "Mobile number"
                ? `tel:${value.replace(/[^+\d]/g, "")}`
                : label === "Email address"
                  ? `mailto:${value}`
                  : value
            }
            target={label === "Social link" ? "_blank" : undefined}
            rel={label === "Social link" ? "noopener noreferrer" : undefined}
            className="mt-0.5 block truncate text-[13px] font-medium text-ink hover:text-brand-600"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 text-[13px] font-medium text-ink-faint">Pending</p>
        )}
      </div>
    </div>
  );
}

/**
 * The Contact us section. It uses the same station numbers and the same
 * static station content as the Stations page. A missing contact value is
 * shown as pending.
 */
export function ContactSection() {
  const [selected, setSelected] = useState(1);
  const content = getStationContent(selected);

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
            <div className="mt-3 grid grid-cols-4 gap-2.5">
              {STATION_IDS.map((id) => {
                const active = id === selected;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelected(id)}
                    aria-pressed={active}
                    className={`min-h-[44px] rounded-lg border px-2 text-[13px] font-medium transition-colors ${
                      active
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    Station {id}
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
              Station {selected} personnel
            </h3>
            <p className="mt-1 text-[12px] text-ink-muted">
              Station staff for Station {selected}. Reach them for any station
              support.
            </p>

            <div className="mt-3">
              <PlaceholderBadge label="Placeholder station" />
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
