import type { WithdrawalRequestRow } from "@/lib/wallet";
import { WithdrawalRequestRow as WithdrawalRequestItem } from "@/components/account/WithdrawalRequestRow";

export function WithdrawalRequestsList({
  requests,
}: {
  requests: WithdrawalRequestRow[];
}) {
  if (requests.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Заявок на вывод пока нет. После отправки сумма резервируется на счёте
        до решения оператора.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800">
      {requests.map((row) => (
        <WithdrawalRequestItem key={row.id} row={row} />
      ))}
    </ul>
  );
}
