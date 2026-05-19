import { formatPrice } from "@/lib/markets";
import { formatOutcomeLabel } from "@/lib/outcomes";

export function formatShareCount(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  let word: string;
  if (mod10 === 1 && mod100 !== 11) word = "доля";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "доли";
  else word = "долей";
  return `${count} ${word}`;
}

export function formatSharesAtPrice(size: number, price: number): string {
  return `${formatShareCount(size)} по ${formatPrice(price)}`;
}

export function describeOpenOrder(
  direction: "buy" | "sell",
  side: string,
  remaining: number,
  price: number,
  outcomeLabel?: string | null,
): { actionLine: string; termsLine: string } {
  const outcome = formatOutcomeLabel(side, outcomeLabel);
  const verb = direction === "buy" ? "Купить" : "Продать";
  return {
    actionLine: `${verb}: ${outcome}`,
    termsLine: formatSharesAtPrice(remaining, price),
  };
}

/** Публичная сделка на странице рынка (без направления покупателя). */
export function describeMarketTrade(
  side: string,
  size: number,
  price: number,
  outcomeLabel?: string | null,
): { actionLine: string; termsLine: string; notional: number } {
  const outcome = formatOutcomeLabel(side, outcomeLabel);
  return {
    actionLine: `Сделка: ${outcome}`,
    termsLine: formatSharesAtPrice(size, price),
    notional: Math.round(size * price * 100) / 100,
  };
}

export function formatTradeNotional(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export const ACTIVITY_BADGE_CLASS: Record<
  "buy" | "sell" | "payout" | "cancel",
  string
> = {
  buy: "bg-zinc-700/60 text-zinc-300",
  sell: "bg-zinc-700/60 text-zinc-300",
  payout: "bg-emerald-500/15 text-emerald-400",
  cancel: "bg-zinc-800 text-zinc-500",
};
