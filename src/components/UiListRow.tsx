import type { ReactNode } from "react";

export function UiListRow({
  actionLine,
  termsLine,
  meta,
  right,
  className = "",
}: {
  actionLine: ReactNode;
  termsLine?: ReactNode | null;
  meta?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-white">{actionLine}</p>
        {termsLine ? (
          <p className="mt-0.5 text-xs leading-snug text-zinc-500">{termsLine}</p>
        ) : null}
        {meta ? <p className="mt-1 text-xs text-zinc-600">{meta}</p> : null}
      </div>
      {right ? <div className="shrink-0 pt-0.5">{right}</div> : null}
    </div>
  );
}
