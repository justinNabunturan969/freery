const FAQ = [
  {
    question: "Is seat availability automatic?",
    answer:
      "No. Station staff update the counts from what they observe on board, so a number can change while a ferry is boarding.",
  },
  {
    question: "Does the ferry need an internet connection?",
    answer:
      "No. It sends GPS readings by LoRa, and the port station's Wi-Fi puts the data online.",
  },
  {
    question: "Can I use this for marine navigation?",
    answer:
      "No. The site is not a substitute for official marine navigation or safety systems.",
  },
];

export function Faq() {
  return (
    <section className="bg-page py-14 sm:py-16">
      <div className="mx-auto grid w-full max-w-shell gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-[26px] font-bold tracking-tight text-ink-strong sm:text-[30px]">
            A few things to know.
          </h2>
          <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ink-muted">
            Honest answers for passengers.
          </p>
        </div>

        <dl className="space-y-6">
          {FAQ.map((item) => (
            <div key={item.question}>
              <dt className="text-[15px] font-semibold text-ink-strong">
                {item.question}
              </dt>
              <dd className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
