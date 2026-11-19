import { STATUS_LABELS, STATUS_PILL_CLASSES } from "@/lib/constants";
import type { FerryStatus } from "@/lib/types";

/**
 * Status is always a text label with a dot, never colour alone.
 */
export function StatusPill({
  status,
  className = "",
}: {
  status: FerryStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset ${STATUS_PILL_CLASSES[status]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
