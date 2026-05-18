import type { ActivityBadgeVariant } from "@/lib/activity";
import { ACTIVITY_BADGE_CLASS } from "@/lib/portfolio-ui";

export function ActivityBadge({
  label,
  variant,
}: {
  label: string;
  variant: ActivityBadgeVariant;
}) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${ACTIVITY_BADGE_CLASS[variant]}`}
    >
      {label}
    </span>
  );
}
