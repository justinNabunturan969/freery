import { colorOf, FERRY_COLOR_CLASSES } from "@/lib/constants";

/**
 * Seat bar. The bar keeps the ferry identity colour, the count stays next to
 * it, and the caption under it says the number is an estimate.
 */
export function SeatBar({
  seatsAvailable,
  capacity,
  ferry,
  showCount = true,
  className = "",
}: {
  seatsAvailable: number;
  capacity: number;
  /** The boat the bar belongs to, so it can carry the boat's colour. */
  ferry: { id: number; color?: string | null };
  showCount?: boolean;
  className?: string;
}) {
  const color = FERRY_COLOR_CLASSES[colorOf(ferry)];
  const safeCapacity = capacity > 0 ? capacity : 1;
  const percent = Math.max(0, Math.min(100, (seatsAvailable / safeCapacity) * 100));

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="h-1.5 w-full min-w-[70px] overflow-hidden rounded-full bg-slate-200"
        role="img"
        aria-label={`${seatsAvailable} of ${capacity} seats available`}
      >
        <div
          className={`h-full rounded-full ${color.solid}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showCount ? (
        <span className="whitespace-nowrap text-[13px] font-medium text-ink">
          {seatsAvailable} / {capacity}
        </span>
      ) : null}
    </div>
  );
}
