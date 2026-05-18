"use client";

import { useEffect, useId, useRef, useState } from "react";

export function HelpHint({
  label,
  children,
  align = "center",
}: {
  label: string;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const alignClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-zinc-700/80 text-[9px] font-medium leading-none text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-400"
      >
        ?
      </button>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute top-[calc(100%+5px)] z-50 w-52 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-left text-[11px] leading-snug text-zinc-400 shadow-md ${alignClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </span>
  );
}
