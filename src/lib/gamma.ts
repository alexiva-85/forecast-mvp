import type { MarketCategory } from "@/lib/types";
import { slugifyTitle } from "@/lib/slug";

/** Read-only Polymarket Gamma API — справочник идей, не для исполнения сделок. */
export const GAMMA_API_URL =
  process.env.GAMMA_API_URL ?? "https://gamma-api.polymarket.com";

export const POLYMARKET_MARKET_URL = "https://polymarket.com/market";

export interface GammaRawMarket {
  id: string;
  question: string;
  slug: string;
  description?: string | null;
  endDate?: string | null;
  outcomes?: string | null;
  outcomePrices?: string | null;
  volumeNum?: number | null;
  closed?: boolean | null;
  active?: boolean | null;
  negRisk?: boolean | null;
  events?: Array<{
    title?: string;
    slug?: string;
    tags?: Array<{ slug?: string; label?: string }>;
  }>;
}

export interface GammaMarketDraft {
  sourceId: string;
  polymarketUrl: string;
  title: string;
  slug: string;
  description: string;
  category: MarketCategory;
  closesAt: string;
  tags: string;
  resolutionRules: string;
  resolutionChecklist: string;
  referenceYesPrice: number | null;
  volumeUsd: number | null;
}

export interface GammaMarketIdea {
  id: string;
  slug: string;
  question: string;
  endDate: string | null;
  yesPrice: number | null;
  volumeUsd: number | null;
  polymarketUrl: string;
  category: MarketCategory;
  draft: GammaMarketDraft;
}

const DEFAULT_CHECKLIST = [
  "Событие завершено",
  "Источник резолва проверен",
  "Исход однозначен (Да/Нет)",
  "Правила Forecast согласованы с оператором",
].join("\n");

const SPORT_RE =
  /\b(sport|sports|nfl|nba|nhl|mlb|ufc|soccer|football|tennis|champions|world cup|super bowl|premier league|f1|formula)\b/i;
const CRYPTO_RE =
  /\b(crypto|bitcoin|btc|eth|ethereum|solana|defi|token|blockchain)\b/i;

export function parseGammaYesPrice(outcomePrices: string | null | undefined): number | null {
  if (!outcomePrices) return null;
  try {
    const prices = JSON.parse(outcomePrices) as string[];
    const n = parseFloat(prices[0]);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  } catch {
    return null;
  }
}

export function isBinaryYesNoMarket(market: GammaRawMarket): boolean {
  try {
    const outcomes = JSON.parse(market.outcomes ?? "[]") as string[];
    return outcomes.length === 2 && outcomes[0] === "Yes" && outcomes[1] === "No";
  } catch {
    return false;
  }
}

export function isGammaIdeaCandidate(market: GammaRawMarket): boolean {
  return (
    market.active === true &&
    market.closed !== true &&
    market.negRisk !== true &&
    isBinaryYesNoMarket(market)
  );
}

export function inferGammaCategory(market: GammaRawMarket): MarketCategory {
  const eventTags =
    market.events?.flatMap((e) => e.tags?.map((t) => t.slug ?? t.label ?? "") ?? []) ??
    [];
  const hay = [
    market.question,
    market.description ?? "",
    market.events?.[0]?.title ?? "",
    ...eventTags,
  ].join(" ");

  if (SPORT_RE.test(hay)) return "sport";
  if (CRYPTO_RE.test(hay)) return "crypto";
  return "crypto";
}

export function gammaSlugToForecast(slug: string, question: string): string {
  const base = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  let candidate = `ref-${base}`.slice(0, 64).replace(/-$/, "");
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(candidate)) return candidate;

  candidate = slugifyTitle(question).slice(0, 56);
  if (candidate && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(candidate)) {
    return `ref-${candidate}`.slice(0, 64).replace(/-$/, "");
  }
  return `ref-${Date.now().toString(36)}`;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function suggestTagsFromGamma(market: GammaRawMarket): string[] {
  const fromEvent =
    market.events?.flatMap((e) =>
      (e.tags ?? [])
        .map((t) => (t.slug ?? t.label ?? "").toLowerCase().trim())
        .filter((t) => t.length >= 2 && t.length <= 32),
    ) ?? [];

  const fromQuestion = market.question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w.length <= 16);

  return [...new Set([...fromEvent, ...fromQuestion])].slice(0, 6);
}

export function buildResolutionRules(market: GammaRawMarket): string {
  const desc = (market.description ?? "").trim();
  const excerpt = desc.length > 1200 ? `${desc.slice(0, 1200)}…` : desc;
  const ref = `${POLYMARKET_MARKET_URL}/${market.slug}`;

  if (!excerpt) {
    return (
      `Адаптируйте правила резолва под Forecast.\n` +
      `Справочник (read-only): ${ref}`
    );
  }

  return (
    `${excerpt}\n\n` +
    `---\n` +
    `Справочник Polymarket (read-only): ${ref}\n` +
    `Перед публикацией на Forecast проверьте источник, даты и формулировку Да/Нет.`
  );
}

/** Параметры RPC `admin_create_market` из шаблона Gamma (A14). */
export function gammaDraftToCreateMarketInput(draft: GammaMarketDraft) {
  const checklist = draft.resolutionChecklist
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const tags = draft.tags
    .split(/[,;\n]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  const closesAtRaw = draft.closesAt.trim();
  const closesAt = closesAtRaw
    ? new Date(closesAtRaw).toISOString()
    : null;

  return {
    p_slug: draft.slug.trim().toLowerCase(),
    p_title: draft.title.trim(),
    p_description: draft.description.trim() || null,
    p_category: draft.category,
    p_closes_at: closesAt,
    p_resolution_rules: draft.resolutionRules.trim(),
    p_resolution_checklist: checklist,
    p_tags: tags,
    p_is_sandbox: false as const,
    p_outcomes: null as null,
  };
}

export function mapGammaMarketToDraft(market: GammaRawMarket): GammaMarketDraft {
  const polymarketUrl = `${POLYMARKET_MARKET_URL}/${market.slug}`;
  const description = (market.description ?? "").trim();
  const shortDesc =
    description.length > 280 ? `${description.slice(0, 277)}…` : description;

  return {
    sourceId: market.id,
    polymarketUrl,
    title: market.question.trim(),
    slug: gammaSlugToForecast(market.slug, market.question),
    description: shortDesc || `Идея с Polymarket: ${market.question}`,
    category: inferGammaCategory(market),
    closesAt: toDatetimeLocalValue(market.endDate),
    tags: suggestTagsFromGamma(market).join(", "),
    resolutionRules: buildResolutionRules(market),
    resolutionChecklist: DEFAULT_CHECKLIST,
    referenceYesPrice: parseGammaYesPrice(market.outcomePrices),
    volumeUsd: market.volumeNum ?? null,
  };
}

export function mapGammaMarketToIdea(market: GammaRawMarket): GammaMarketIdea {
  const draft = mapGammaMarketToDraft(market);
  return {
    id: market.id,
    slug: market.slug,
    question: market.question,
    endDate: market.endDate ?? null,
    yesPrice: draft.referenceYesPrice,
    volumeUsd: draft.volumeUsd,
    polymarketUrl: draft.polymarketUrl,
    category: draft.category,
    draft,
  };
}

export function flattenGammaSearchEvents(
  events: Array<{ markets?: GammaRawMarket[] }> | undefined,
): GammaRawMarket[] {
  const out: GammaRawMarket[] = [];
  for (const event of events ?? []) {
    for (const market of event.markets ?? []) {
      out.push(market);
    }
  }
  return out;
}

export function pickGammaIdeas(markets: GammaRawMarket[], limit: number): GammaMarketIdea[] {
  return markets
    .filter(isGammaIdeaCandidate)
    .slice(0, limit)
    .map(mapGammaMarketToIdea);
}
