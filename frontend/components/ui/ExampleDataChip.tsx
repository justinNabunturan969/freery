/** Amber chip that shows while mock mode is on. */
export function ExampleDataChip({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 ${
        compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-[12px]"
      }`}
      title="The app is showing generated example data, not live station data."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Example data
    </span>
  );
}
