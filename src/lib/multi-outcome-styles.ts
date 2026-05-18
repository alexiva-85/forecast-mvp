/** Нейтральные акценты для multi-outcome (не success/error). */
export const MULTI_OUTCOME_ACCENTS = [
  {
    dot: "bg-emerald-400",
    border: "border-l-emerald-500",
    price: "text-emerald-400",
  },
  {
    dot: "bg-cyan-400",
    border: "border-l-cyan-500",
    price: "text-cyan-400",
  },
  {
    dot: "bg-amber-400",
    border: "border-l-amber-500",
    price: "text-amber-400",
  },
  {
    dot: "bg-violet-400",
    border: "border-l-violet-500",
    price: "text-violet-400",
  },
] as const;

export function getMultiOutcomeAccent(index: number) {
  return MULTI_OUTCOME_ACCENTS[index % MULTI_OUTCOME_ACCENTS.length];
}

export const MULTI_OUTCOME_CARD_PREVIEW = 3;
