import "server-only";

import type { RowDataPacket } from "mysql2";

import { getDbPool } from "@/lib/db";

type SettingRow = RowDataPacket & { key: string; value: string | null };

export const SETTING_DEFAULTS: Record<string, string> = {
  // ── SEO ──
  seo_title:
    "Внедрение ИИ в ваш сайт — Konversus AI | Тимофеев Алексей",
  seo_description:
    "Внедряем искусственный интеллект в существующие сайты: AI-консультанты, авто-обработка заявок, AI-поиск клиентов, умный мониторинг. Превращаем сайт из витрины в продавца.",
  seo_keywords:
    "внедрение ии в сайт, AI интеграция, искусственный интеллект для бизнеса, ии консультант на сайт, авто обработка заявок, ai поиск клиентов, умный сайт, konversus ai, тимофеев алексей, автоматизация бизнеса",
  seo_og_image: "https://konversus.ru/og-image.jpg",

  // ── Аналитика ──
  ym_id: "109448101",
  yw_verification: "f9c5fd333ceeca7f",
  ga_id: "",

  // ── Вставка кода (виджеты, чаты, пиксели) ──
  body_scripts: "",

  // ── Главная: Hero ──
  hero_badge: "Доступен для новых проектов",
  hero_title: "Внедряем ИИ в ваш сайт. Он начинает приносить заявки 24/7.",
  hero_subtitle:
    "Нахожу вашу компанию, анализирую сайт, создаю уникальный цифровой образ товара и производства в целом. Клиент получает персональную презентацию — мини-сайт, видео-аудит и PDF, которые работают вместо холодного звонка.",
  hero_cta_primary: "Обсудить проект",
  hero_cta_secondary: "Как это работает",

  // ── Главная: О себе ──
  about_experience: "17 лет в digital",
  about_bio_1:
    "Меня зовут Алексей. Последние 17 лет я создаю digital-проекты, которые приносят клиентам реальную выручку — не просто «красивые сайты», а инструменты продаж. За эти годы прошёл путь от вёрстки страниц до комплексной цифровой упаковки бизнеса: продающий сайт, фирменный стиль, персональный концепт для первого касания с крупным заказчиком.",
  about_bio_2:
    "Специализация — производственные компании и B2B. Там, где продукт сложный, аудитория серьёзная, а обычный маркетолог не понимает ни производства, ни заказчика. Я понимаю обоих — и делаю упаковку, которая работает.",

  // ── Главная: Контакты ──
  contact_phone: "+7 921 201-32-52",
  contact_phone_href: "tel:+79212013252",
  contact_email: "bilariuss@yandex.ru",
  contact_telegram: "@bilarius",
  contact_telegram_href: "https://t.me/bilarius",
  contact_max_href:
    "https://max.ru/join/EmVxaadn5GxQNTErVmbyRKcQAZDNHjEhxcPQqSTR9wA",

  // ── AI Architect ──
  openrouter_api_key: "",
  architect_fast_model: "deepseek/deepseek-v4-flash",
  architect_strong_model: "qwen/qwen3-235b-a22b-2507",
  architect_daily_limit: "10",
  architect_global_per_minute: "20",

  // ── PageSpeed Insights API (опционально, без ключа — бесплатно до 25k/день) ──
  pagespeed_api_key: "",

  // ── Avito API ──
  avito_client_id: "",
  avito_client_secret: "",

  // ── Lead Hunter / Telegram ──
  telegram_bot_token: "",
  telegram_chat_id: "",

  // ── Lead Radar Auto ──
  lead_radar_daily_queue_limit: "40",
  lead_radar_daily_send_limit: "40",
  lead_radar_auto_send_enabled: "1",
  lead_radar_manual_respects_limit: "0",
  lead_radar_auto_send_interval_min: "30",
  lead_radar_collect_per_tick: "2",
  lead_radar_vertical_weights: "",
};

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = getDbPool();
  const [rows] = await db.query<SettingRow[]>(
    "SELECT `key`, `value` FROM site_settings"
  );
  const result: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value ?? "";
  }
  return result;
}

export async function getSetting(key: string): Promise<string> {
  const db = getDbPool();
  const [rows] = await db.query<SettingRow[]>(
    "SELECT `value` FROM site_settings WHERE `key` = ?",
    [key]
  );
  if (rows.length > 0 && rows[0].value !== null) return rows[0].value;
  return SETTING_DEFAULTS[key] ?? "";
}

export async function setManySetting(
  data: Record<string, string>
): Promise<void> {
  const db = getDbPool();
  const entries = Object.entries(data);
  if (entries.length === 0) return;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of entries) {
      await conn.execute(
        "INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()",
        [key, value]
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
