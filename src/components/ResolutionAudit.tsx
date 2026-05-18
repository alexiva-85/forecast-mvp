import Link from "next/link";

export function ResolutionAudit({
  comment,
  proofUrl,
  resolvedAt,
  className = "",
}: {
  comment?: string | null;
  proofUrl?: string | null;
  resolvedAt?: string | null;
  className?: string;
}) {
  if (!comment && !proofUrl && !resolvedAt) return null;

  return (
    <section
      className={`rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-sm ${className}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Резолв
      </p>
      {resolvedAt && (
        <p className="mt-1 text-xs text-zinc-600">
          {new Date(resolvedAt).toLocaleString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
      {comment && (
        <p className="mt-2 leading-relaxed text-zinc-300">{comment}</p>
      )}
      {proofUrl && (
        <Link
          href={proofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-emerald-400 hover:underline"
        >
          Источник и доказательство ↗
        </Link>
      )}
    </section>
  );
}
