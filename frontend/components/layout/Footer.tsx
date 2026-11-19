import { SectionLink } from "@/components/ui/SectionLink";

/**
 * Footer: logo, a one line project description, the two section links and
 * the safety notice.
 */
export function Footer({ useMock }: { useMock: boolean }) {
  return (
    <footer className="mt-16 bg-navy text-white/80">
      <div className="mx-auto w-full max-w-shell px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo/freery-icon.svg"
                alt=""
                width={30}
                height={30}
                className="h-[30px] w-[30px] rounded-[9px]"
              />
              <span className="text-[19px] font-bold tracking-tight text-white">
                freery
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/70">
              Freery tracks ferries on Route A with GPS and LoRa, so passengers
              know where the ferry is and how many seats are estimated to be
              free.
            </p>
          </div>

          <nav aria-label="Footer" className="flex gap-8 text-[13px]">
            <SectionLink
              id="ferries"
              className="text-white/80 transition-colors hover:text-white"
            >
              Passenger view
            </SectionLink>
            <SectionLink
              id="contact"
              className="text-white/80 transition-colors hover:text-white"
            >
              Contact us
            </SectionLink>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>Not for marine navigation or safety use.</span>
          {useMock ? (
            <span>Example data. Not verified passenger information.</span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
