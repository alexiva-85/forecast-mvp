import { categoryLabel, formatPrice } from "@/lib/markets";
import { displayOutcomePrice } from "@/lib/outcomes";
import type { MarketWithPrice } from "@/lib/types";

const DESCRIPTION_MAX = 160;

export function truncateDescription(text: string, max = DESCRIPTION_MAX): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function marketMetaDescription(market: MarketWithPrice): string {
  if (market.description?.trim()) {
    return truncateDescription(market.description);
  }
  const category = categoryLabel(market.category);
  const status =
    market.status === "open"
      ? "торги открыты"
      : market.status === "resolved"
        ? "исход зафиксирован"
        : "торги закрыты";
  return truncateDescription(
    `${market.title} — прогнозный рынок (${category}, ${status}). Тестовые деньги, без реальных платежей.`,
  );
}

export function marketOgSubtitle(market: MarketWithPrice): string {
  const category = categoryLabel(market.category);
  if (market.outcome_mode === "multi" || (market.outcomes?.length ?? 0) > 2) {
    const top = [...(market.outcomes ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 2)
      .map((o) => {
        const p = displayOutcomePrice(market, o.outcome_key);
        return `${o.label} ${formatPrice(p)}`;
      });
    return top.length > 0 ? `${top.join(" · ")} · ${category}` : category;
  }
  const yes = displayOutcomePrice(market, "yes");
  return `Да ${formatPrice(yes)} · ${category}`;
}

export function isMarketIndexable(
  market: Pick<MarketWithPrice, "status" | "is_sandbox">,
): boolean {
  return market.status !== "draft" && !market.is_sandbox;
}
