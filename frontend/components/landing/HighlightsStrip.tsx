import { RouteIcon, ScreenIcon, ShieldIcon, SignalIcon } from "@/components/ui/icons";

const ITEMS: {
  icon: typeof SignalIcon;
  title: string | ((stationCount: number) => string);
  detail: string;
}[] = [
  {
    icon: SignalIcon,
    title: "GPS + LoRa",
    detail: "Low-power ferry tracking",
  },
  {
    icon: RouteIcon,
    title: (stationCount) => `${stationCount}-stop route`,
    detail: "One line, every station",
  },
  {
    icon: ScreenIcon,
    title: "Any screen",
    detail: "Phone, tablet or desktop",
  },
  {
    icon: ShieldIcon,
    title: "Clear rules",
    detail: "Estimates, never promises",
  },
];

/**
 * The four short highlights under the hero.
 *
 * The route length comes from the live station list, so it stays right when a
 * station is added.
 */
export function HighlightsStrip({ stationCount = 8 }: { stationCount?: number }) {
  return (
    <section className="border-b border-line bg-page">
      <div className="mx-auto w-full max-w-shell px-4 py-6 sm:px-6">
        <dl className="grid grid-cols-2 gap-5 sm:gap-8 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.detail}>
              <dt className="flex items-start gap-3 text-[14px] font-semibold text-ink">
                <item.icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-500" />
                {typeof item.title === "function"
                  ? item.title(stationCount)
                  : item.title}
              </dt>
              <dd className="mt-0.5 pl-[30px] text-[12px] text-ink-muted">
                {item.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
