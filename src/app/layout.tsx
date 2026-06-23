import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Montserrat } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { BodyScriptInjector } from "@/components/body-script-injector";
import KonversusNav from "@/components/konversus-nav";
import KonversusFooter from "@/components/konversus-footer";
import { getAllSettings } from "@/lib/data/settings";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getAllSettings();
  return {
  metadataBase: new URL("https://konversus.ru"),
  title: {
    default: s.seo_title,
    template: "%s · Тимофеев Алексей · konversus.ru",
  },
  description: s.seo_description,
  keywords: s.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean),
  authors: [{ name: "Тимофеев Алексей", url: "https://konversus.ru" }],
  creator: "Тимофеев Алексей",
  publisher: "konversus.ru",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://konversus.ru",
    siteName: "konversus.ru",
    title: s.seo_title,
    description: s.seo_description,
    images: [
      {
        url: s.seo_og_image || "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Тимофеев Алексей — цифровая упаковка для B2B",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: s.seo_title,
    description: s.seo_description,
    images: [s.seo_og_image || "/og-image.jpg"],
  },
  alternates: {
    canonical: "https://konversus.ru",
  },
  verification: {
    yandex: s.yw_verification,
  },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const s = await getAllSettings();
  const ymId = s.ym_id || "109448101";
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${plexMono.variable} ${montserrat.variable} h-full antialiased`}
    >
      <head>
        {/* Yandex Metrika */}
        <Script id="ym-init" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
  k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
  (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
  ym(${ymId},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`}
        </Script>
        {/* Schema.org Person */}
        <Script id="schema-person" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "Тимофеев Алексей",
            "url": "https://konversus.ru",
            "jobTitle": "Digital Packaging Specialist",
            "description": "Специалист по цифровой упаковке производственных компаний. Создаю персональные концепты: мини-сайт, видео-аудит, PDF-презентация для B2B-продаж.",
            "sameAs": [
              "https://t.me/bilarius",
              "https://vk.ru/bilarius",
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+7-921-201-32-52",
              "contactType": "sales",
              "availableLanguage": "Russian",
            },
          })}
        </Script>
        {/* Schema.org Service */}
        <Script id="schema-service" type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Цифровая упаковка для производственных компаний",
            "provider": {
              "@type": "Person",
              "name": "Тимофеев Алексей",
              "url": "https://konversus.ru",
            },
            "description": "Уникальный цифровой образ товара и компании: персональная презентация клиента — мини-сайт, видео-аудит, PDF-предложение для B2B.",
            "areaServed": "RU",
            "serviceType": "Digital Proposal, B2B Marketing, Industrial Branding",
          })}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <KonversusNav />
        <main className="flex-1" style={{ paddingTop: 56 }}>{children}</main>
        <KonversusFooter />
        {/* Yandex Metrika noscript */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${ymId}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </noscript>
        {/* Пользовательский код (виджеты, чаты, пиксели) */}
        {s.body_scripts && <BodyScriptInjector html={s.body_scripts} />}
      </body>
    </html>
  );
}
