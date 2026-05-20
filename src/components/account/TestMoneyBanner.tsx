import Link from "next/link";

type Variant = "deposit" | "withdraw" | "general";

const COPY: Record<
  Variant,
  { title: string; body: string; cta?: { href: string; label: string } }
> = {
  general: {
    title: "Тестовые деньги",
    body: "Сейчас на счёте виртуальный USD для MVP: торговля и выплаты по резолву работают, но пополнение и вывод реальными средствами недоступны до юридической модели (E2) и подключения платёжного провайдера.",
  },
  deposit: {
    title: "Пополнение недоступно",
    body: "При регистрации на счёт зачисляется $10\u00a0000 тестовых средств. Реальное пополнение картой, СБП или криптой появится после согласования финансового контура (блок E2) — без интеграции PSP в этом спринте.",
    cta: { href: "/portfolio/withdraw", label: "Заявка на вывод (заготовка) →" },
  },
  withdraw: {
    title: "Вывод — только заявка",
    body: "Можно оформить заявку на вывод: она сохранится со статусом «На рассмотрении», баланс не списывается и выплата не выполняется, пока не подключён платёжный контур. После E2 оператор обработает очередь вручную или через PSP.",
    cta: { href: "/portfolio/deposit", label: "Как устроено пополнение →" },
  },
};

export function TestMoneyBanner({ variant = "general" }: { variant?: Variant }) {
  const { title, body, cta } = COPY[variant];

  return (
    <aside
      className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100/90"
      role="note"
    >
      <p className="font-medium text-amber-200">{title}</p>
      <p className="mt-2 text-amber-100/80">{body}</p>
      {cta ? (
        <p className="mt-3">
          <Link
            href={cta.href}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
          >
            {cta.label}
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
