import { UiListRow } from "@/components/UiListRow";
import {
  formatUsdAmount,
  withdrawalMethodLabel,
  withdrawalStatusLabel,
  type WithdrawalRequestRow,
} from "@/lib/wallet";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WithdrawalRequestsList({
  requests,
}: {
  requests: WithdrawalRequestRow[];
}) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Заявок на вывод пока нет. После отправки они появятся здесь со статусом
        обработки.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800">
      {requests.map((row) => (
        <li key={row.id} className="px-4 py-3">
          <UiListRow
            actionLine={`Вывод · ${withdrawalMethodLabel(row.method)}`}
            termsLine={
              row.details
                ? row.details
                : withdrawalStatusLabel(row.status)
            }
            meta={formatDate(row.created_at)}
            right={
              <div className="text-right">
                <p className="text-sm font-medium tabular-nums text-zinc-300">
                  −${formatUsdAmount(row.amount)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {withdrawalStatusLabel(row.status)}
                </p>
              </div>
            }
          />
        </li>
      ))}
    </ul>
  );
}
