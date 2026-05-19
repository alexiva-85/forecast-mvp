import type { AdminMarket } from "@/lib/admin";

export type AdminQualityWarningCode =
  | "title_short"
  | "title_vague"
  | "closes_at_past"
  | "rules_short";

export interface AdminQualityWarning {
  code: AdminQualityWarningCode;
  message: string;
}

export interface AdminQualityMarketWarning {
  market: AdminMarket;
  warnings: AdminQualityWarning[];
}

const TITLE_MIN_LEN = 15;
const RULES_MIN_LEN = 40;

const VAGUE_RE =
  /\b(может|возможно|скорее всего|вероятно|наверное|примерно|около)\b/i;

export function qualityWarningMeta(code: AdminQualityWarningCode): {
  label: string;
  className: string;
} {
  switch (code) {
    case "title_short":
      return { label: "Название", className: "text-amber-300/90" };
    case "title_vague":
      return { label: "Формулировка", className: "text-amber-300/90" };
    case "closes_at_past":
      return { label: "Дата", className: "text-rose-300/90" };
    case "rules_short":
      return { label: "Правила", className: "text-amber-300/80" };
  }
}

export function checkMarketDraftQuality(input: {
  title: string;
  closesAt?: string | null;
  resolutionRules?: string;
  status?: "open" | "closed" | "resolved";
}): AdminQualityWarning[] {
  const warnings: AdminQualityWarning[] = [];
  const title = input.title.trim();
  const status = input.status ?? "open";

  if (title.length > 0 && title.length < TITLE_MIN_LEN) {
    warnings.push({
      code: "title_short",
      message: `Короткое название (${title.length} симв., лучше ≥ ${TITLE_MIN_LEN})`,
    });
  }

  if (title.length > 0 && VAGUE_RE.test(title)) {
    warnings.push({
      code: "title_vague",
      message: "Размытая формулировка («может», «вероятно»…) — уточните критерий",
    });
  }

  if (status === "open" && input.closesAt) {
    const closes = new Date(input.closesAt).getTime();
    if (!Number.isNaN(closes) && closes < Date.now()) {
      warnings.push({
        code: "closes_at_past",
        message: "Дата закрытия торгов в прошлом",
      });
    }
  }

  const rules = (input.resolutionRules ?? "").trim();
  if (rules.length > 0 && rules.length < RULES_MIN_LEN) {
    warnings.push({
      code: "rules_short",
      message: "Правила резолва слишком короткие — добавьте источник и критерий",
    });
  }

  return warnings;
}

export function buildMarketQualityWarnings(
  markets: AdminMarket[],
): AdminQualityMarketWarning[] {
  const items: AdminQualityMarketWarning[] = [];

  for (const market of markets) {
    if (market.is_sandbox || market.status !== "open") continue;

    const warnings = checkMarketDraftQuality({
      title: market.title,
      closesAt: market.closes_at,
      resolutionRules: market.resolution_rules ?? "",
      status: market.status,
    });

    if (warnings.length > 0) {
      items.push({ market, warnings });
    }
  }

  items.sort((a, b) => {
    const severity = (w: AdminQualityWarning[]) =>
      w.some((x) => x.code === "closes_at_past") ? 0 : 1;
    const s = severity(a.warnings) - severity(b.warnings);
    if (s !== 0) return s;
    return a.market.title.localeCompare(b.market.title, "ru");
  });

  return items;
}
