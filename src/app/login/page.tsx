import type { Metadata } from "next";
import { LoginForms } from "@/components/LoginForms";

export const metadata: Metadata = {
  title: "Вход",
  description:
    "Войдите в Forecast: Google, GitHub, magic link или пароль. Тестовый баланс $10 000.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; reset?: string }>;
}) {
  const { error, next, reset } = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">Вход</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Тестовый счёт: $10&nbsp;000 виртуальных средств. Вход через Google,
        GitHub, ссылку на email или пароль.
      </p>
      {reset === "ok" && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Пароль обновлён. Войдите с новым паролем.
        </p>
      )}
      {next === "/admin" && (
        <p className="mt-3 text-sm text-amber-400/90">
          Войдите под аккаунтом администратора, чтобы открыть админку.
        </p>
      )}
      <LoginForms nextPath={next} initialError={error} />
    </div>
  );
}
