import type { Metadata } from "next";

import { ContactDock } from "@/components/portfolio-timeline/contact-dock";
import { PortfolioSidebar } from "@/components/portfolio-timeline/sidebar";
import { TimelineView } from "@/components/portfolio-timeline/timeline-view";
import { PROFILE_PHOTO } from "@/components/portfolio-timeline/profile";
import { getCurrentAdmin } from "@/lib/auth/session";
import { getAllSettings } from "@/lib/data/settings";
import { listEntries } from "@/lib/portfolio-timeline/queries";
import type { PortfolioPage } from "@/lib/portfolio-timeline/types";

const PAGE_URL = "https://konversus.ru/portfolio/timeline";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Алексей Тимофеев — AI Engineer, дизайнер и разработчик",
  },
  description:
    "Портфолио Алексея Тимофеева: AI engineering, веб-разработка, визуальный контент, дизайн, AI-автоматизация и digital projects.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: PAGE_URL,
    title: "Алексей Тимофеев — AI Engineer, дизайнер и разработчик",
    description:
      "Портфолио Алексея Тимофеева: AI engineering, веб-разработка, визуальный контент, дизайн, AI-автоматизация и digital projects.",
    images: [{ url: PROFILE_PHOTO, alt: "Алексей Тимофеев" }],
  },
  robots: { index: true, follow: true },
};

const emptyPage: PortfolioPage = { entries: [], nextCursor: null };

export default async function PortfolioTimelinePage() {
  const [admin, settings] = await Promise.all([getCurrentAdmin(), getAllSettings()]);
  let initial = emptyPage;
  let loadError = false;

  try {
    initial = await listEntries({ includeDrafts: Boolean(admin) });
  } catch {
    loadError = true;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Алексей Тимофеев — портфолио",
    url: PAGE_URL,
    inLanguage: "ru-RU",
    isPartOf: { "@type": "WebSite", name: "konversus.ru", url: "https://konversus.ru" },
    about: {
      "@type": "Person",
      name: "Алексей Тимофеев",
      url: "https://konversus.ru/about",
      sameAs: ["https://t.me/bilarius"],
    },
  };

  return (
    <div className="relative z-[1] bg-[var(--background)] text-[var(--foreground)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto flex min-h-[70vh] max-w-[1240px] flex-col min-[900px]:flex-row">
        <PortfolioSidebar />
        <TimelineView isAdmin={Boolean(admin)} initial={initial} loadError={loadError} />
      </div>
      <ContactDock
        phone={settings.contact_phone}
        phoneHref={settings.contact_phone_href}
        vkHref="https://vk.com/bilarius"
        telegram={settings.contact_telegram}
        telegramHref={settings.contact_telegram_href}
        maxHref={settings.contact_max_href}
      />
    </div>
  );
}
