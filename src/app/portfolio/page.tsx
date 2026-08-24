import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ArrowRight, User } from "lucide-react";
import { NORDIC_PORTFOLIO } from "@/data/nordic-portfolio";
import { NordicPortfolioGrid } from "@/components/nordic-portfolio-grid";

const PAGE_URL = "https://konversus.ru/portfolio";
const OG_IMAGE = "https://konversus.ru/portfolio/services/konversus.jpg";

export const metadata: Metadata = {
  title: "Портфолио Тимофеева Алексея — сервисы и сайты",
  description:
    "Портфолио Тимофеева Алексея: живые продукты и сайты — со скриншотами. Leads AI, Chat, НОРДИК, клиентские проекты на одном хостинге.",
  keywords: [
    "портфолио Тимофеев Алексей",
    "Konversus",
    "Leads AI",
    "Nordic Builder",
    "НОРДИК конструктор сайтов",
    "разработка сайтов",
    "цифровая упаковка",
    "proektmap",
    "маркет-фон",
  ],
  authors: [{ name: "Тимофеев Алексей", url: "https://konversus.ru/about" }],
  creator: "Тимофеев Алексей",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "konversus.ru",
    title: "Портфолио · Тимофеев Алексей",
    description: "Сервисы и сайты — реальные проекты автора Konversus со скриншотами.",
    url: PAGE_URL,
    images: [{ url: OG_IMAGE, width: 1440, height: 900, alt: "Портфолио Тимофеева Алексея" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Портфолио · Тимофеев Алексей",
    description: "Сервисы и сайты — реальные проекты автора Konversus.",
    images: [OG_IMAGE],
  },
  alternates: { canonical: PAGE_URL },
};

function portfolioJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Портфолио Тимофеева Алексея — сервисы и сайты",
    description:
      "Живые продукты и сайты автора Konversus со скриншотами первого экрана.",
    url: PAGE_URL,
    inLanguage: "ru-RU",
    isPartOf: { "@type": "WebSite", name: "konversus.ru", url: "https://konversus.ru" },
    about: {
      "@type": "Person",
      name: "Тимофеев Алексей",
      url: "https://konversus.ru/about",
      sameAs: ["https://t.me/bilarius", "https://www.behance.net/timofeev_aleksey"],
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: NORDIC_PORTFOLIO.length,
      itemListElement: NORDIC_PORTFOLIO.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebSite",
          name: item.title,
          description: item.description,
          url: item.url.startsWith("http") ? item.url : `https://konversus.ru${item.url}`,
          image: `https://konversus.ru${item.image}`,
        },
      })),
    },
  };
}

export default function PortfolioPage() {
  const products = NORDIC_PORTFOLIO.filter((i) => i.category === "product").length;
  const sites = NORDIC_PORTFOLIO.filter((i) => i.category === "site").length;

  return (
    <div className="min-h-screen bg-[#0a0e13] text-gray-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(portfolioJsonLd()) }}
      />

      <header className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
            Портфолио · Тимофеев Алексей
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Сервисы и сайты
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-400">
            Реальные проекты автора Konversus — не макеты, а то, что открывается по ссылке. На карточках —
            title и description с самих сайтов. Дизайн и полиграфия — в разделе{" "}
            <Link href="/about#portfolio" className="text-indigo-400 hover:text-indigo-300">
              «Обо мне»
            </Link>
            .
          </p>

          <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm">
            <User size={16} className="text-indigo-400" />
            <span className="text-gray-400">Кто за проектами:</span>
            <Link href="/about" className="font-semibold text-white hover:text-indigo-300">
              Тимофеев Алексей — обо мне
            </Link>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">17 лет в digital</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-2xl font-extrabold text-indigo-400">{NORDIC_PORTFOLIO.length}</p>
              <p className="text-gray-500">проектов в витрине</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-indigo-400">{products}</p>
              <p className="text-gray-500">продуктов</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-indigo-400">{sites}</p>
              <p className="text-gray-500">сайтов на Nordic</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Обо мне <ArrowRight size={14} />
            </Link>
            <a
              href="https://t.me/bilarius"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:border-white/20"
            >
              <MessageCircle size={16} /> Написать в Telegram
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <NordicPortfolioGrid items={NORDIC_PORTFOLIO} />
      </section>

      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-14 text-center">
          <h2 className="text-2xl font-bold text-white">Нужен такой же контур под ваш бизнес?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
            Сайт, конструктор, сбор заявок или AI-консультант — поднимаю на Nordic и сопровождаю.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-gray-300 hover:border-white/20"
            >
              Сначала обо мне
            </Link>
            <a
              href="https://t.me/bilarius"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <MessageCircle size={16} /> Написать в Telegram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
