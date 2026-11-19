import { ArrowRightIcon } from "@/components/ui/icons";
import { SectionLink } from "@/components/ui/SectionLink";

export function RoleCards() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        <h2 className="text-[26px] font-bold tracking-tight text-ink-strong sm:text-[30px]">
          One service. Clear roles.
        </h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted">
          Passengers watch the route. Station staff keep the counts honest.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="flex flex-col justify-between rounded-xl bg-navy p-6 text-white shadow-lift sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-300">
                For passengers
              </p>
              <h3 className="mt-3 text-[21px] font-bold tracking-tight">
                Travel better informed.
              </h3>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/65">
                See the ferry positions, the next arrival and the estimated
                seats free, all from your phone.
              </p>
            </div>
            <SectionLink
              id="ferries"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg bg-white px-4 text-[14px] font-semibold text-navy transition-colors hover:bg-brand-50"
            >
              See the live ferry positions
              <ArrowRightIcon className="h-4 w-4" />
            </SectionLink>
          </article>

          <article className="flex flex-col justify-between rounded-xl border border-line bg-brand-50 p-6 shadow-card sm:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">
                For station teams
              </p>
              <h3 className="mt-3 text-[21px] font-bold tracking-tight text-ink-strong">
                Stay in control.
              </h3>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-muted">
                Station staff update passenger counts and station notices from
                their own devices. The public site only reads what they enter.
              </p>
            </div>
            <p className="mt-6 inline-flex min-h-[44px] items-center self-start rounded-lg border border-brand-200 bg-white px-4 text-[14px] font-semibold text-ink-muted">
              Station console · Coming soon
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
