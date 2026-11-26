import { PhoneIcon } from "@/components/ui/icons";

/**
 * One contact line: an icon, a label and the value.
 *
 * A value that has not been published yet is shown as **Pending**, so the
 * passenger can see that the station has a mobile number and that it has not
 * been given yet, rather than seeing nothing at all.
 *
 * It is used in the station details and in the contact section of the landing
 * page, so the two can never say different things about the same station.
 */
export function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PhoneIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-brand-400" aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
        {value ? (
          <a
            href={
              label === "Mobile number"
                ? `tel:${value.replace(/[^+\d]/g, "")}`
                : label === "Email address"
                  ? `mailto:${value}`
                  : value
            }
            target={label === "Social link" ? "_blank" : undefined}
            rel={label === "Social link" ? "noopener noreferrer" : undefined}
            className="mt-0.5 block truncate text-[13px] font-medium text-ink hover:text-brand-600"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 text-[13px] font-medium text-ink-faint">Pending</p>
        )}
      </div>
    </div>
  );
}
