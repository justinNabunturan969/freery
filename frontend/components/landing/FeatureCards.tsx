import { CheckIcon, FerryIcon, UsersIcon } from "@/components/ui/icons";

const CARDS = [
  {
    icon: FerryIcon,
    title: "Follow your ferry",
    detail:
      "See the latest reported position of each ferry on Route A, so you know whether to wait or walk.",
  },
  {
    icon: UsersIcon,
    title: "Check available seats",
    detail:
      "Station staff count passengers on board, and Freery shows how many seats are estimated to be free.",
  },
  {
    icon: CheckIcon,
    title: "Know what is running",
    detail:
      "Every ferry shows its current status, its next stop and when it is expected to arrive.",
  },
];

export function FeatureCards() {
  return (
    <section className="bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        <h2 className="text-[26px] font-bold tracking-tight text-ink-strong sm:text-[30px]">
          A clearer picture of your trip.
        </h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted">
          Everything you need before you leave for the port, on one screen.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {CARDS.map((card) => (
            <article
              key={card.title}
              className="rounded-xl border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-lift"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500">
                <card.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[16px] font-semibold text-ink-strong">
                {card.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                {card.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
