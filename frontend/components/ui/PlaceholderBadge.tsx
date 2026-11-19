/**
 * A small badge that marks content as a placeholder.
 *
 * The physical device is not finished and the route has not been surveyed, so
 * the station names, coordinates and photos on screen are examples. This badge
 * says so next to the content itself, instead of relying on a note far away
 * on the page.
 */
export function PlaceholderBadge({
  label = "Placeholder",
  title,
  className = "",
}: {
  label?: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 ${className}`}
      title={title ?? "Example content. The device and the station survey are not finished yet."}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {label}
    </span>
  );
}
