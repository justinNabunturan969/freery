import { ArrowRightIcon } from "@/components/ui/icons";
import { SectionLink } from "@/components/ui/SectionLink";

export function ClosingCta() {
  return (
    <section className="bg-navy py-12 text-white sm:py-14">
      <div className="mx-auto flex w-full max-w-shell flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight sm:text-[28px]">
            Your next crossing, with less guesswork.
          </h2>
          <p className="mt-1.5 text-[13px] text-white/60">
            Check your ferry before you head for the port.
          </p>
        </div>
        <SectionLink
          id="ferries"
          className="inline-flex min-h-[46px] shrink-0 items-center gap-2 self-start rounded-lg bg-white px-5 text-[15px] font-semibold text-navy transition-colors hover:bg-brand-50 md:self-auto"
        >
          Track your ferry now
          <ArrowRightIcon className="h-4 w-4" />
        </SectionLink>
      </div>
    </section>
  );
}
