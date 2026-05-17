import Link from "next/link";

export function AdminAccessDenied() {
  return (
    <section className="mx-auto max-w-lg px-4 py-12 text-center">
      <p className="text-zinc-400">Доступ только для администратора.</p>
      <p className="mt-4 text-sm text-zinc-600">
        Попросите владельца проекта выдать права администратора или{" "}
        <Link href="/" className="text-amber-400/90 hover:underline">
          вернитесь на главную
        </Link>
        .
      </p>
    </section>
  );
}
