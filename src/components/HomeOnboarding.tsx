import Link from "next/link";

const STEPS = [
  {
    title: "Создайте аккаунт",
    body: "Войдите через Google, GitHub, email или пароль. На счёт сразу зачисляется $10\u00a0000 тестовых средств.",
  },
  {
    title: "Выберите рынок",
    body: "Откройте событие и оцените вероятность по цене доли — от 1¢ до 99¢ за исход.",
  },
  {
    title: "Торгуйте в стакане",
    body: "Покупайте и продавайте доли до резолва. Выигрышная доля платит $1, проигрышная — $0.",
  },
] as const;

export function HomeOnboarding() {
  return (
    <section
      className="mb-10 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/80 to-zinc-950/40 p-6 sm:p-8"
      aria-labelledby="home-onboarding-heading"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-500/90">
        Как это работает
      </p>
      <h2
        id="home-onboarding-heading"
        className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl"
      >
        Прогнозная биржа на тестовых деньгах
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
        Forecast — свой стакан и учёт сделок, без Polymarket CLOB. Сейчас MVP:
        виртуальный баланс, русский интерфейс, админ-резолв исходов.
      </p>

      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-400"
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <HomeOnboardingCtas />
    </section>
  );
}

function HomeOnboardingCtas() {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
      >
        Войти и начать
      </Link>
      <a
        href="#markets"
        className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
      >
        Смотреть рынки
      </a>
    </div>
  );
}
