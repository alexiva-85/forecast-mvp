export function AdminMarketSlug({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  return (
    <p className={`text-xs text-zinc-500 ${className}`.trim()}>
      <span className="text-zinc-600">Slug: </span>
      <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[11px] text-amber-400/90">
        {slug}
      </code>
    </p>
  );
}
