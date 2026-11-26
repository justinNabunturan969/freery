/**
 * A small badge that marks content as a placeholder.
 *
 * It says so next to the content itself, instead of relying on a note far away
 * on the page. The caller gives the wording, because what is still missing is
 * different from one place to the next.
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
      title={title ?? "This is still example content. It will be replaced once it has been confirmed."}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {label}
    </span>
  );
}
