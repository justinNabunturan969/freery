const STEPS = [
  {
    title: "The ferry reports",
    detail:
      "A GPS module reads the position on board. The ESP32 on the ferry packages it and sends it over LoRa.",
  },
  {
    title: "The station receives",
    detail:
      "The port station ESP32 picks up the LoRa packet, adds the signal quality and sends it to the station PC over Wi-Fi.",
  },
  {
    title: "You stay informed",
    detail:
      "The read-only API publishes the latest position, and this site shows it to passengers as a live route.",
  },
];

const CHAIN = [
  "NEO-6M GPS",
  "ferry ESP32",
  "SX1278 LoRa",
  "port ESP32 and Wi-Fi",
  "Freery",
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      tabIndex={-1}
      className="scroll-mt-[96px] bg-page py-14 sm:py-16"
    >
      <div className="mx-auto w-full max-w-shell px-4 sm:px-6">
        <h2 className="text-[26px] font-bold tracking-tight text-ink-strong sm:text-[30px]">
          From ferry to screen.
        </h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted">
          The whole chain, and nothing hidden in the middle.
        </p>

        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-line bg-white p-6 shadow-card">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-[12px] font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3.5 text-[16px] font-semibold text-ink-strong">
                {step.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                {step.detail}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-7 rounded-xl border border-brand-200 bg-white px-4 py-3.5 text-center text-[13px] font-medium text-ink">
          {CHAIN.map((part, index) => (
            <span key={part}>
              {index > 0 ? (
                <span aria-hidden="true" className="mx-2 text-brand-400">
                  →
                </span>
              ) : null}
              {part}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
