import type { Metadata } from "next";

import { ResumeSheet, resumeSheetCss, type ResumeContacts } from "@/components/portfolio-timeline/resume-sheet";
import { SETTING_DEFAULTS, getAllSettings } from "@/lib/data/settings";

const PAGE_URL = "https://konversus.ru/portfolio/resume";

export const metadata: Metadata = {
  title: { absolute: "Алексей Тимофеев — резюме" },
  description:
    "Алексей Тимофеев: сайты, упаковка и визуал для производств, услуг и B2B. Великий Новгород, удалённо.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "profile",
    locale: "ru_RU",
    url: PAGE_URL,
    title: "Алексей Тимофеев — резюме",
    description: "Сайты, упаковка и визуал для производств, услуг и B2B.",
  },
  robots: { index: true, follow: true },
};

async function loadContacts(): Promise<ResumeContacts> {
  const fallback: ResumeContacts = {
    phone: SETTING_DEFAULTS.contact_phone,
    phoneHref: SETTING_DEFAULTS.contact_phone_href,
    email: SETTING_DEFAULTS.contact_email,
    telegram: SETTING_DEFAULTS.contact_telegram,
    telegramHref: SETTING_DEFAULTS.contact_telegram_href,
    maxHref: SETTING_DEFAULTS.contact_max_href,
  };
  try {
    const s = await getAllSettings();
    return {
      phone: s.contact_phone || fallback.phone,
      phoneHref: s.contact_phone_href || fallback.phoneHref,
      email: s.contact_email || fallback.email,
      telegram: s.contact_telegram || fallback.telegram,
      telegramHref: s.contact_telegram_href || fallback.telegramHref,
      maxHref: s.contact_max_href || fallback.maxHref,
    };
  } catch {
    return fallback;
  }
}

export default async function ResumePage() {
  const contacts = await loadContacts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Алексей Тимофеев",
    url: PAGE_URL,
    jobTitle: "Собираю digital для производств, услуг и B2B: сайты, упаковку, визуал",
    image: "https://konversus.ru/sales-doc/uploads/2026/05/82eb66a3fa60b3f306af1c2a.jpg",
    email: contacts.email,
    telephone: contacts.phoneHref.replace("tel:", ""),
    sameAs: [
      contacts.telegramHref,
      "https://vk.ru/bilarius",
      "https://vkvideo.ru/@craftum_design",
      "https://www.behance.net/timofeev_aleksey",
      "https://kwork.ru/user/bilarius",
    ].filter(Boolean),
  };

  return (
    <div className="resume-stage">
      <style dangerouslySetInnerHTML={{ __html: resumeSheetCss }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="resume-toolbar">
        <a href="/resume/aleksey-timofeev.pdf" download="Алексей-Тимофеев-резюме.pdf">
          Скачать PDF
        </a>
      </p>
      <ResumeSheet contacts={contacts} />
    </div>
  );
}
