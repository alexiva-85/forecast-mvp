import { marketStatusLabel } from "@/lib/markets";
import type { MarketStatus } from "@/lib/types";

const CHIP_CLASS: Record<MarketStatus, string> = {
  open: "bg-emerald-500/10 text-emerald-400",
  closed: "bg-amber-500/10 text-amber-400",
  resolved: "bg-zinc-700/60 text-zinc-400",
};

export function MarketStatusChip({ status }: { status: MarketStatus }) {
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${CHIP_CLASS[status]}`}
    >
      {marketStatusLabel(status)}
    </span>
  );
}
