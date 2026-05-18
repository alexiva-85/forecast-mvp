"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createMarket } from "@/app/actions/admin";
import { slugifyTitle } from "@/lib/slug";
import type { GammaMarketDraft } from "@/lib/gamma";
import { MarketCard } from "@/components/MarketCard";
import type { MarketWithPrice } from "@/lib/types";

const RULE_TEMPLATES = {
  crypto:
    "Резолв по официальным данным биржи (указать пару и тип свечи). Да — если критерий выполнен до даты закрытия торгов.",
  sport:
    "Резолв по официальному результату турнира (источник: сайт организатора). Да — если условие в названии рынка выполнено.",
} as const;

const CHECKLIST_TEMPLATES = {
  crypto: "Событие наступило\nИсточник проверен\nИсход однозначен",
  sport: "Матч/турнир завершён\nОфициальный результат опубликован\nИсход однозначен",
} as const;

export function AdminMarketWizard({ draft }: { draft?: GammaMarketDraft | null }) {
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [title, setTitle] = useState(draft?.title ?? "");
  const [slug, setSlug] = useState(draft?.slug ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [category, setCategory] = useState<"sport" | "crypto">(
    draft?.category ?? "crypto",
  );
  const [closesAt, setClosesAt] = useState(draft?.closesAt ?? "");
  const [tags, setTags] = useState(draft?.tags ?? "");
  const [resolutionRules, setResolutionRules] = useState(
    draft?.resolutionRules ?? "",
  );
  const [resolutionChecklist, setResolutionChecklist] = useState(
    draft?.resolutionChecklist ?? "",
  );
  const [isSandbox, setIsSandbox] = useState(false);
  const [isMultiOutcome, setIsMultiOutcome] = useState(false);
  const [outcomeLabels, setOutcomeLabels] = useState("");

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugifyTitle(value));
  }

  function applyTemplate() {
    setResolutionRules(RULE_TEMPLATES[category]);
    setResolutionChecklist(CHECKLIST_TEMPLATES[category]);
  }

  const previewMarket: MarketWithPrice = {
    id: "preview",
    slug: slug || "preview-market",
    title: title || "Название рынка",
    description: description || null,
    category,
    status: "open",
    resolved_side: null,
    closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    resolution_rules: resolutionRules || null,
    resolution_checklist: resolutionChecklist
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
    tags: tags
      .split(/[,;\n]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8),
    is_sandbox: isSandbox,
    created_at: new Date().toISOString(),
    yes_price: draft?.referenceYesPrice ?? 0.5,
    outcome_mode: isMultiOutcome ? "multi" : "binary",
    outcomes: isMultiOutcome
      ? outcomeLabels
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .map((label, i) => ({
            outcome_key: `o${i + 1}`,
            label,
            sort_order: i,
          }))
      : [
          { outcome_key: "yes", label: "Да", sort_order: 0 },
          { outcome_key: "no", label: "Нет", sort_order: 1 },
        ],
    outcome_prices: isMultiOutcome
      ? Object.fromEntries(
          outcomeLabels
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .map((_, i) => [`o${i + 1}`, 0.5]),
        )
      : { yes: draft?.referenceYesPrice ?? 0.5, no: 0.5 },
  };

  function canGoStep2() {
    return title.trim().length > 0 && (slugTouched ? slug : slugifyTitle(title));
  }

  function canGoStep3() {
    return (
      resolutionRules.trim().length > 0 &&
      resolutionChecklist.trim().split("\n").filter((l) => l.trim()).length > 0
    );
  }

  function submit() {
    setMessage(null);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("slug", slug);
    formData.set("description", description);
    formData.set("category", category);
    formData.set("closesAt", closesAt);
    formData.set("tags", tags);
    formData.set("resolutionRules", resolutionRules);
    formData.set("resolutionChecklist", resolutionChecklist);
    if (isSandbox) formData.set("isSandbox", "true");

    if (isMultiOutcome) {
      const lines = outcomeLabels
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 3 || lines.length > 8) {
        setMessage("Мульти-исход: от 3 до 8 строк (по одному названию)");
        return;
      }
      const outcomes = lines.map((label, i) => ({
        key: `o${i + 1}`,
        label,
      }));
      formData.set("isMultiOutcome", "true");
      formData.set("outcomesJson", JSON.stringify(outcomes));
    }

    startTransition(async () => {
      const result = await createMarket(formData);
      if (result.error) setMessage(result.error);
      else setMessage(`Рынок опубликован: /market/${result.slug}`);
    });
  }

  return (
    <section className="space-y-6">
      <nav className="flex gap-2 text-sm">
        {([1, 2, 3] as const).map((n) => (
          <span
            key={n}
            className={`rounded-full px-3 py-1 ${
              step === n
                ? "bg-amber-500/20 text-amber-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {n === 1 ? "Основное" : n === 2 ? "Условия" : "Проверка"}
          </span>
        ))}
      </nav>

      {draft && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400/90">
          Шаблон из Gamma (id {draft.sourceId}). Проверьте правила перед публикацией.{" "}
          <a
            href={draft.polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Источник ↗
          </a>
        </p>
      )}

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <Field label="Название *">
            <input
              required
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className={inputClass}
              placeholder="Bitcoin выше $200k до конца 2027"
            />
          </Field>
          <Field label="Описание">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder="Кратко для карточки в каталоге"
            />
          </Field>
          <Field label="Категория *">
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "sport" | "crypto")
              }
              className={inputClass}
            >
              <option value="sport">Спорт</option>
              <option value="crypto">Крипто</option>
            </select>
          </Field>
          <Field label="Теги">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputClass}
              placeholder="bitcoin, крипто (через запятую)"
            />
          </Field>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            {showAdvanced ? "Скрыть" : "Показать"} расширенные настройки
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={isMultiOutcome}
              onChange={(e) => setIsMultiOutcome(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Мульти-исход (3–8 вариантов, sandbox рекомендуется)
          </label>
          {isMultiOutcome && (
            <Field label="Исходы (по одному на строку) *">
              <textarea
                rows={5}
                value={outcomeLabels}
                onChange={(e) => setOutcomeLabels(e.target.value)}
                className={inputClass}
                placeholder={"Кандидат A\nКандидат B\nКандидат C"}
              />
            </Field>
          )}
          {showAdvanced && (
            <Field label="Slug (URL)">
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-zinc-600">
                Генерируется из названия автоматически
              </p>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={isSandbox}
              onChange={(e) => setIsSandbox(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Тестовый рынок (не показывать в каталоге)
          </label>
          <footer className="flex justify-end">
            <button
              type="button"
              disabled={!canGoStep2()}
              onClick={() => setStep(2)}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40"
            >
              Далее
            </button>
          </footer>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <Field label="Закрытие торгов">
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className={inputClass}
            />
          </Field>
          <button
            type="button"
            onClick={applyTemplate}
            className="text-xs text-amber-400/90 hover:underline"
          >
            Подставить шаблон правил для «
            {category === "crypto" ? "Крипто" : "Спорт"}»
          </button>
          <Field label="Правила резолва *">
            <textarea
              required
              rows={4}
              value={resolutionRules}
              onChange={(e) => setResolutionRules(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Чеклист перед резолвом *">
            <textarea
              required
              rows={4}
              value={resolutionChecklist}
              onChange={(e) => setResolutionChecklist(e.target.value)}
              className={inputClass}
            />
          </Field>
          <footer className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={!canGoStep3()}
              onClick={() => setStep(3)}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40"
            >
              Далее
            </button>
          </footer>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          {isMultiOutcome && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
              <p className="font-medium">Мульти-исход ({previewMarket.outcomes.length})</p>
              <ul className="mt-2 list-inside list-disc text-amber-200/80">
                {previewMarket.outcomes.map((o) => (
                  <li key={o.outcome_key}>{o.label}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-zinc-400">Так рынок будет выглядеть в каталоге:</p>
          <MarketCard market={previewMarket} />
          <footer className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
            >
              {pending ? "Публикуем…" : "Опубликовать рынок"}
            </button>
          </footer>
          {message && (
            <p
              className={`text-sm ${message.includes("опубликован") ? "text-emerald-400" : "text-rose-400"}`}
            >
              {message}
              {message.includes("опубликован") && (
                <>
                  {" "}
                  <Link href={`/market/${slug}`} className="underline">
                    Открыть
                  </Link>
                </>
              )}
            </p>
          )}
        </section>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white";
