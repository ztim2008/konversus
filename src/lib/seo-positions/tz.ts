/** Часовые пояса проектов без перехода на летнее время: Ташкент UTC+5, Москва UTC+3. */
export function timeZoneFor(gl: string) {
  return gl === "uz" ? "Asia/Tashkent" : "Europe/Moscow";
}

export function utcOffsetHours(gl: string) {
  return gl === "uz" ? 5 : 3;
}

/** Границы месяца YYYY-MM в часовом поясе проекта, как UTC-даты. */
export function monthRangeUtc(month: string, gl: string): { from: Date; to: Date } {
  const [y, m] = month.split("-").map(Number);
  const off = utcOffsetHours(gl);
  return {
    from: new Date(Date.UTC(y, m - 1, 1, -off)),
    to: new Date(Date.UTC(y, m, 1, -off)),
  };
}

/** Дата YYYY-MM-DD по городу проекта: 0 — сегодня, 1 — вчера и т. д. */
export function localDayAgo(gl: string, daysAgo: number, now = Date.now()) {
  return new Date(now - daysAgo * 86400_000 + utcOffsetHours(gl) * 3600_000).toISOString().slice(0, 10);
}

export function isMonth(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function currentMonth(gl: string, now = new Date()) {
  const local = new Date(now.getTime() + utcOffsetHours(gl) * 3600_000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_PREP = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];

export function monthTitle(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function monthPrep(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_PREP[m - 1]} ${y}`;
}
