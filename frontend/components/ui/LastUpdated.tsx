/**
 * "Updated 08:37 AM · Example route" line used on the route cards.
 */
export function LastUpdated({
  timestamp,
  note,
  className = "",
}: {
  timestamp: string | Date | null | undefined;
  note?: string;
  className?: string;
}) {
  const text = formatClock(timestamp);
  return (
    <p className={`text-[12px] text-ink-muted ${className}`}>
      {text ? `Updated ${text}` : "Waiting for the first update"}
      {note ? <span className="text-ink-faint"> · {note}</span> : null}
    </p>
  );
}

export function formatClock(
  timestamp: string | Date | null | undefined,
): string | null {
  if (!timestamp) return null;
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** "Wed, 13 Nov 2026, 08:37 AM" style stamp for the page header. */
export function formatFullDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
