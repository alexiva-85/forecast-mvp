import Link from "next/link";

export function MarketCatalogFilters({
  category,
  q,
  tag,
  popularTags,
}: {
  category: string;
  q: string;
  tag: string;
  popularTags: string[];
}) {
  const tabs = [
    { id: "all", label: "Все" },
    { id: "sport", label: "Спорт" },
    { id: "crypto", label: "Крипто" },
  ];

  function hrefFor(next: { category?: string; q?: string; tag?: string }) {
    const params = new URLSearchParams();
    const c = next.category ?? category;
    const query = next.q ?? q;
    const t = next.tag ?? tag;

    if (c && c !== "all") params.set("category", c);
    if (query) params.set("q", query);
    if (t) params.set("tag", t);

    const s = params.toString();
    return s ? `/?${s}` : "/";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={hrefFor({ category: tab.id, tag: "" })}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              category === tab.id
                ? "bg-white text-zinc-900"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        {category !== "all" && (
          <input type="hidden" name="category" value={category} />
        )}
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Поиск по названию и описанию…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Найти
        </button>
        {(q || tag) && (
          <Link
            href={hrefFor({ q: "", tag: "" })}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white"
          >
            Сбросить
          </Link>
        )}
      </form>

      {popularTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">Теги:</span>
          {popularTags.map((t) => (
            <Link
              key={t}
              href={hrefFor({ tag: t })}
              className={`rounded-md px-2.5 py-1 text-xs transition ${
                tag === t
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
