export function ResolutionRules({
  rules,
  checklist,
}: {
  rules: string | null;
  checklist: string[];
}) {
  if (!rules && checklist.length === 0) return null;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <h2 className="mb-3 text-sm font-medium text-zinc-400">Правила резолва</h2>
      {rules && (
        <p className="text-sm leading-relaxed text-zinc-300">{rules}</p>
      )}
      {checklist.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-zinc-500">
          {checklist.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-zinc-600">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
