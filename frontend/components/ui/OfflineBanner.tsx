/**
 * Shown when the station cannot be reached. SWR keeps the last good data on
 * screen, so the banner explains the data on screen is the last known data.
 */
export function OfflineBanner({
  message = "Station offline, showing last known data",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">{message}</span>
    </div>
  );
}
