/**
 * The three short notes that close both tracking pages.
 */
export type InfoStripItem = {
  title: string;
  detail: string;
};

export function InfoStrip({
  title,
  items,
}: {
  title: string;
  items: InfoStripItem[];
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-[17px] font-semibold tracking-tight text-ink-strong">
        {title}
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-3 sm:gap-6">
        {items.map((item) => (
          <div key={item.title}>
            <p className="text-[13px] font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
