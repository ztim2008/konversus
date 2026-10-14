const MONTHS = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"] as const;

export const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"] as const;

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

/** Гражданская дата в Москве: 2026-10-14 */
export function moscowDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function moscowTodayKey() {
  return moscowDateKey(new Date());
}

export function parseMonthKey(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/** Границы месяца по московским часам, для сравнения с convert_tz(..., '+03:00'). */
export function moscowMonthRange(key: string) {
  const parsed = parseMonthKey(key);
  if (!parsed) return null;
  const nextMonth = parsed.month === 12 ? 1 : parsed.month + 1;
  const nextYear = parsed.month === 12 ? parsed.year + 1 : parsed.year;
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    start: `${parsed.year}-${pad(parsed.month)}-01 00:00:00`,
    end: `${nextYear}-${pad(nextMonth)}-01 00:00:00`,
  };
}

export function monthLabel(key: string) {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return MONTH_NAMES[parsed.month - 1] ?? key;
}

export function worksLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} работа`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} работы`;
  return `${count} работ`;
}

/** Дата ленты в Москве: 06 ОКТ 2026 */
export function formatPortfolioDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return `${day} ${MONTHS[month - 1] ?? ""} ${year}`.trim();
}
