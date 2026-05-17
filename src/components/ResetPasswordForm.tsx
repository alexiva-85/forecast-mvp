"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");

    async function init() {
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(
            "Ссылка устарела или уже использована. Запросите сброс пароля снова на странице входа.",
          );
          setReady(true);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "Сессия не найдена. Откройте ссылку из письма ещё раз или запросите новую на /login.",
        );
      }

      setReady(true);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setError(null);
      }
    });

    void init();

    return () => subscription.unsubscribe();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");

    if (password.length < 6) {
      setError("Пароль не короче 6 символов");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/login?reset=ok");
    router.refresh();
  }

  if (!ready) {
    return <p className="mt-6 text-sm text-zinc-500">Проверяем ссылку…</p>;
  }

  return (
    <>
      {error && (
        <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}

      {!error && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <p className="text-sm text-zinc-400">
            Задайте новый пароль для входа. Регистрация не нужна — аккаунт уже есть.
          </p>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Новый пароль</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">
              Повторите пароль
            </label>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-white py-2.5 font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {pending ? "Сохраняем…" : "Сохранить пароль"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/login" className="text-emerald-400 hover:underline">
          ← К входу
        </Link>
      </p>
    </>
  );
}
