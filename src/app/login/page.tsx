import Link from "next/link";
import { signIn, signUp } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">Вход</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Тестовый счёт: $10&nbsp;000 виртуальных средств
      </p>
      {error && (
        <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error === "auth" ? "Неверный email или пароль" : decodeURIComponent(error)}
        </p>
      )}

      <form action={signIn} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Пароль</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-white py-2.5 font-medium text-zinc-900 hover:bg-zinc-200"
        >
          Войти
        </button>
      </form>

      <div className="my-8 border-t border-zinc-800" />

      <h2 className="text-lg font-medium text-white">Регистрация</h2>
      <form action={signUp} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Имя</label>
          <input
            name="displayName"
            type="text"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Пароль</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg border border-zinc-600 py-2.5 font-medium text-white hover:bg-zinc-900"
        >
          Создать аккаунт
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/" className="text-emerald-400 hover:underline">
          ← К рынкам
        </Link>
      </p>
    </div>
  );
}
