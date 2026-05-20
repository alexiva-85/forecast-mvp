import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { getSiteOrigin } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "Forecast — прогнозные рынки",
    template: "%s · Forecast",
  },
  description:
    "Русскоязычная прогнозная биржа: покупайте доли исходов по вероятности рынка. MVP на тестовых деньгах — свой стакан и резолв.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Forecast",
    title: "Forecast — прогнозные рынки",
    description:
      "Торгуйте долями «Да» и «Нет» на реальных событиях. Тестовый баланс при регистрации.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forecast — прогнозные рынки",
    description:
      "Прогнозная биржа на тестовых деньгах. Свой стакан, без Polymarket CLOB.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
          Тестовые деньги · MVP · Не является финансовой услугой
        </footer>
      </body>
    </html>
  );
}
