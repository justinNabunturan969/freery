"use client";

import { ExampleDataChip } from "@/components/ui/ExampleDataChip";
import { SectionLink } from "@/components/ui/SectionLink";
import { useActiveSection } from "@/lib/useActiveSection";

/**
 * The sections of the one page, in the order they appear.
 *
 * Every entry in the bar moves the reader to the section, so the bar is a
 * set of anchors rather than a set of pages.
 */
const LINKS = [
  { id: "top", label: "Home" },
  { id: "ferries", label: "Ferries" },
  { id: "stations", label: "Stations" },
  { id: "how-it-works", label: "How it works" },
  { id: "contact", label: "Contact us" },
];

const LINK_IDS = LINKS.map((link) => link.id);

/**
 * The navigation bar.
 *
 * The underline follows the reader. The section that owns the reading line
 * just under the header is the active one, so the bar shows where the reader
 * is on the page.
 */
export function Navbar({ useMock }: { useMock: boolean }) {
  const active = useActiveSection(LINK_IDS);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        {/* Desktop bar */}
        <div className="hidden h-16 items-center gap-8 md:flex">
          <SectionLink
            id="top"
            className="flex items-center gap-2.5"
            aria-label="Freery home"
          >
            <img
              src="/logo/freery-icon.svg"
              alt=""
              width={34}
              height={34}
              className="h-[34px] w-[34px] rounded-[10px]"
            />
            <span className="text-[21px] font-bold tracking-tight text-ink">
              freery
            </span>
          </SectionLink>

          <nav aria-label="Main" className="flex items-center gap-7">
            {LINKS.map((link) => {
              const isActive = active === link.id;
              return (
                <SectionLink
                  key={link.id}
                  id={link.id}
                  aria-current={isActive ? "true" : undefined}
                  className={`border-b-2 pb-[3px] text-[15px] transition-colors ${
                    isActive
                      ? "border-brand-500 font-semibold text-brand-600"
                      : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {link.label}
                </SectionLink>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {useMock ? <ExampleDataChip /> : null}
            <SectionLink
              id="ferries"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-brand-500 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Track a ferry
            </SectionLink>
          </div>
        </div>

        {/* Mobile compact header */}
        <div className="flex h-14 items-center justify-between md:hidden">
          <SectionLink
            id="top"
            className="flex items-center gap-2"
            aria-label="Freery home"
          >
            <img
              src="/logo/freery-icon.svg"
              alt=""
              width={30}
              height={30}
              className="h-[30px] w-[30px] rounded-[9px]"
            />
            <span className="text-[19px] font-bold tracking-tight text-ink">
              freery
            </span>
          </SectionLink>
          <div className="flex items-center gap-2">
            {useMock ? <ExampleDataChip compact /> : null}
            <SectionLink
              id="ferries"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-brand-500 px-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Track a ferry
            </SectionLink>
          </div>
        </div>

        {/* Mobile tab row */}
        <nav
          aria-label="Main"
          className="-mx-4 flex items-center gap-1 overflow-x-auto border-t border-line px-4 md:hidden"
        >
          {LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <SectionLink
                key={link.id}
                id={link.id}
                aria-current={isActive ? "true" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-[14px] transition-colors ${
                  isActive
                    ? "border-brand-500 font-semibold text-brand-600"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
              </SectionLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
