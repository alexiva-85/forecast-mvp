"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateMarket } from "@/app/actions/admin";
import { toDatetimeLocalValue } from "@/lib/gamma";
import type { Market } from "@/lib/types";
import { categoryLabel } from "@/lib/markets";
import { adminStatusLabel } from "@/lib/admin";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none";

export function AdminMarketEditForm({ market }: { market: Market }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState(market.title);
  const [slug, setSlug] = useState(market.slug);
  const [description, setDescription] = useState(market.description ?? "");
  const [category, setCategory] = useState<"sport" | "crypto">(market.category);
  const [closesAt, setClosesAt] = useState(
    toDatetimeLocalValue(market.closes_at),
  );
  const [tags, setTags] = useState(market.tags.join(", "));
  const [resolutionRules, setResolutionRules] = useState(
    market.resolution_rules ?? "",
  );
  const [resolutionChecklist, setResolutionChecklist] = useState(
    market.resolution_checklist.join("\n"),
  );

  const slugEditable = market.status === "draft";
  const slugLocked = !slugEditable;

  function submit() {
    setMessage(null);
    const checklist = resolutionChecklist
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!title.trim() || !resolutionRules.trim() || checklist.length === 0) {
      setMessage("Заполните обязательные поля");
      return;
    }

    const formData = new FormData();
    formData.set("marketSlug", market.slug);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("category", category);
    formData.set("closesAt", closesAt);
    formData.set("tags", tags);
    formData.set("resolutionRules", resolutionRules);
    formData.set("resolutionChecklist", resolutionChecklist);
    if (slugEditable) {
      formData.set("newSlug", slug);
    }

    startTransition(async () => {
      const result = await updateMarket(formData);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      const targetSlug = result.slug ?? market.slug;
      if (targetSlug !== market.slug) {
        window.location.href = `/admin/markets/${targetSlug}/edit?saved=1`;
        return;
      }
      setMessage("Изменения сохранены");
      router.refresh();
    });
  }

  return (
    <section className="space-y-6">
      <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
        Статус:{" "}
        <span className="text-zinc-200">{adminStatusLabel(market.status)}</span>
        {market.is_sandbox && (
          <span className="ml-2 text-violet-400">· тестовый</span>
        )}
        {slugLocked && (
          <span className="mt-2 block text-xs text-zinc-500">
            Slug нельзя менять после публикации — только текст, даты и правила
            резолва.
          </span>
        )}
      </p>

      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <Field label="Название *">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Slug (URL)">
          <input
            value={slug}
            readOnly={slugLocked}
            disabled={slugLocked}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className={`${inputClass} ${slugLocked ? "opacity-60" : ""}`}
          />
        </Field>

        <Field label="Описание">
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
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
            <option value="sport">{categoryLabel("sport")}</option>
            <option value="crypto">{categoryLabel("crypto")}</option>
          </select>
        </Field>

        <Field label="Теги">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={inputClass}
            placeholder="через запятую, до 8"
          />
        </Field>

        <Field label="Закрытие торгов">
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Правила резолва *">
          <textarea
            rows={4}
            value={resolutionRules}
            onChange={(e) => setResolutionRules(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Чеклист резолва * (по строке)">
          <textarea
            rows={4}
            value={resolutionChecklist}
            onChange={(e) => setResolutionChecklist(e.target.value)}
            className={inputClass}
          />
        </Field>
      </section>

      {message && (
        <p
          className={`text-sm ${
            message.includes("сохранен") ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}

      <footer className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-40"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <Link
          href="/admin/markets"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          К списку рынков
        </Link>
        <Link
          href={`/market/${market.slug}`}
          className="text-sm text-emerald-400 hover:underline"
        >
          На сайте ↗
        </Link>
      </footer>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-zinc-400">{label}</span>
      {children}
    </label>
  );
}
