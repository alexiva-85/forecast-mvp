import Link from "next/link";

export function AdminChecksPanel({
  missingRules,
  missingClosesAt,
  sandboxCount,
  sandboxUnresolved,
}: {
  missingRules: number;
  missingClosesAt: number;
  sandboxCount: number;
  sandboxUnresolved: number;
}) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Проверки
      </h3>
      <ul className="mt-3 space-y-2 text-zinc-300">
        <li className="flex justify-between gap-4">
          <span className="text-zinc-500">Без правил резолва</span>
          <span className={missingRules > 0 ? "text-rose-400" : ""}>
            {missingRules}
          </span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-zinc-500">Без даты закрытия</span>
          <span className={missingClosesAt > 0 ? "text-rose-400" : ""}>
            {missingClosesAt}
          </span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-zinc-500">Тестовых рынков</span>
          <span className="text-zinc-400">{sandboxCount}</span>
        </li>
      </ul>
      {sandboxUnresolved > 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          {sandboxUnresolved} тестовых скрыты из каталога
        </p>
      )}
      {sandboxCount > 0 && (
        <Link
          href="/admin/markets?tab=sandbox"
          className="mt-3 inline-block text-xs font-medium text-zinc-400 underline-offset-2 hover:text-white hover:underline"
        >
          Открыть тестовые рынки
        </Link>
      )}
    </article>
  );
}
