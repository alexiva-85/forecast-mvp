"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { buildAuthCallbackUrl } from "@/lib/auth-callback-url";
import { mapMagicLinkError, mapOAuthStartError } from "@/lib/auth-errors";
import type { Provider } from "@supabase/supabase-js";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function LoginForms({
  nextPath,
  initialError,
}: {
  nextPath?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "auth"
      ? "Не удалось войти. Попробуйте снова или выберите другой способ."
      : initialError
        ? decodeURIComponent(initialError)
        : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState<
    "signin" | "signup" | "reset" | "magic" | Provider | null
  >(null);

  function authCallbackUrl(): string {
    return buildAuthCallbackUrl(window.location.origin, nextPath);
  }

  function mapSignInError(message: string, code?: string): string {
    const lower = message.toLowerCase();
    if (
      code === "email_not_confirmed" ||
      lower.includes("email not confirmed") ||
      lower.includes("email not verified")
    ) {
      return "Подтвердите email по ссылке из письма, затем войдите снова.";
    }
    if (lower.includes("invalid login credentials")) {
      return (
        "Неверный email или пароль. Введите тот же пароль, что при регистрации " +
        "(проверьте раскладку и автозаполнение Safari). Или нажмите «Забыли пароль?»."
      );
    }
    return message;
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending("signin");

    const form = new FormData(e.currentTarget);
    const loginEmail = normalizeEmail(String(form.get("email") ?? ""));
    const password = String(form.get("password") ?? "");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    setPending(null);

    if (authError) {
      setError(mapSignInError(authError.message, authError.code));
      return;
    }

    router.push(safeAuthRedirect(nextPath));
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending("signup");

    const form = new FormData(e.currentTarget);
    const signupEmail = normalizeEmail(String(form.get("email") ?? ""));
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();

    if (password !== passwordConfirm) {
      setPending(null);
      setError("Пароль и подтверждение не совпадают");
      return;
    }

    setEmail(signupEmail);
    setSignupPassword("");
    setSignupPasswordConfirm("");

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: signupEmail,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined,
    });

    if (authError) {
      setPending(null);
      setError(authError.message);
      return;
    }

    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setPending(null);
      setInfo(
        "Этот email уже зарегистрирован. Войдите выше или восстановите пароль.",
      );
      return;
    }

    if (data.session) {
      setPending(null);
      router.push(safeAuthRedirect(nextPath));
      router.refresh();
      return;
    }

    // Confirm email выключен — сразу входим тем же паролем
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: signupEmail,
      password,
    });

    setPending(null);

    if (!signInError) {
      router.push(safeAuthRedirect(nextPath));
      router.refresh();
      return;
    }

    setInfo(
      `Аккаунт создан для ${signupEmail}. Войдите выше с тем же паролем ` +
        `или нажмите «Забыли пароль?».`,
    );
  }

  async function handleForgotPassword() {
    const loginEmail = normalizeEmail(email);
    if (!loginEmail) {
      setError("Сначала введите email в поле выше");
      return;
    }

    setError(null);
    setInfo(null);
    setPending("reset");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      loginEmail,
      { redirectTo },
    );

    setPending(null);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setInfo(`Ссылка для сброса пароля отправлена на ${loginEmail}`);
  }

  async function handleMagicLink() {
    const loginEmail = normalizeEmail(email);
    if (!loginEmail) {
      setError("Сначала введите email в поле ниже");
      return;
    }

    setError(null);
    setInfo(null);
    setPending("magic");

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: {
        emailRedirectTo: authCallbackUrl(),
        shouldCreateUser: true,
      },
    });

    setPending(null);

    if (otpError) {
      setError(mapMagicLinkError(otpError.message));
      return;
    }

    setInfo(
      `Ссылка для входа отправлена на ${loginEmail}. Откройте письмо и перейдите по ссылке.`,
    );
  }

  async function handleOAuth(provider: Provider) {
    setError(null);
    setInfo(null);
    setPending(provider);

    const supabase = createClient();
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authCallbackUrl() },
    });

    if (oauthError) {
      setPending(null);
      setError(mapOAuthStartError(oauthError.message));
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
      return;
    }

    setPending(null);
    setError("Не удалось открыть страницу входа. Попробуйте снова.");
  }

  const oauthBusy = pending === "google" || pending === "github";

  return (
    <>
      {info && (
        <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {info}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => handleOAuth("google")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending === "google" ? "Переходим…" : "Войти через Google"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => handleOAuth("github")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending === "github" ? "Переходим…" : "Войти через GitHub"}
        </button>
      </div>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-zinc-800" />
        </div>
        <p className="relative flex justify-center text-xs uppercase tracking-wide text-zinc-600">
          <span className="bg-zinc-950 px-2">или email</span>
        </p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            autoComplete="current-password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <button
          type="submit"
          disabled={pending !== null}
          className="w-full rounded-lg bg-white py-2.5 font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {pending === "signin" ? "Входим…" : "Войти с паролем"}
        </button>
        <button
          type="button"
          disabled={pending !== null || oauthBusy}
          onClick={handleMagicLink}
          className="w-full rounded-lg border border-emerald-500/40 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
        >
          {pending === "magic"
            ? "Отправляем ссылку…"
            : "Войти по ссылке на email"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={handleForgotPassword}
          className="w-full text-center text-xs text-zinc-500 hover:text-emerald-400"
        >
          {pending === "reset" ? "Отправляем…" : "Забыли пароль?"}
        </button>
      </form>

      <div className="my-8 border-t border-zinc-800" />

      <h2 className="text-lg font-medium text-white">Регистрация</h2>
      <p className="mt-1 text-xs text-zinc-600">
        После создания аккаунта вы войдёте автоматически — запомните пароль.
      </p>
      {signupPasswordConfirm.length > 0 &&
        signupPassword !== signupPasswordConfirm && (
          <p className="mt-3 text-sm text-rose-400">Пароли не совпадают</p>
        )}
      <form onSubmit={handleSignUp} className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Имя</label>
          <input
            name="displayName"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={email}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Пароль *</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
          <p className="mt-1 text-xs text-zinc-600">Минимум 6 символов</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">
            Подтверждение пароля *
          </label>
          <input
            name="passwordConfirm"
            type="password"
            required
            minLength={6}
            value={signupPasswordConfirm}
            onChange={(e) => setSignupPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            className={`w-full rounded-lg border bg-zinc-900 px-3 py-2 text-white ${
              signupPasswordConfirm.length > 0 &&
              signupPassword !== signupPasswordConfirm
                ? "border-rose-500/60"
                : "border-zinc-700"
            }`}
          />
        </div>
        <button
          type="submit"
          disabled={
            pending !== null ||
            !signupPassword ||
            signupPassword !== signupPasswordConfirm
          }
          className="w-full rounded-lg border border-zinc-600 py-2.5 font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
        >
          {pending === "signup" ? "Создаём…" : "Создать аккаунт"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/" className="text-emerald-400 hover:underline">
          ← К рынкам
        </Link>
      </p>
    </>
  );
}
