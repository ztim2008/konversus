/**
 * Письмо про карточки каталога. Текст фиксированный.
 * Меняются только название товара, артикул и 1–2 проблемы.
 */

export function catalogLetterSubject(productName: string): string {
  const name = productName.replace(/\s+/g, " ").trim();
  return `Фото и инфографика для вашего каталога, пример на ${name}`;
}

export function catalogCardLabel(productName: string, sku: string): string {
  const name = productName.replace(/\s+/g, " ").trim();
  const art = sku.replace(/\s+/g, " ").trim();
  return art ? `${name}, ${art}` : name;
}

export function catalogLetterText(input: {
  productName: string;
  sku?: string;
  problems: string;
}): string {
  const problems = input.problems.replace(/\s+/g, " ").trim();
  const card = catalogCardLabel(input.productName, input.sku || "");
  return `Здравствуйте!

Меня зовут Алексей, я дизайнер карточек товаров. 7 лет делаю их для Wildberries, Ozon, Яндекс Маркета и Lamoda.

Посмотрел ваш каталог. Продукция у вас хорошая, но на сайте её трудно разглядеть: ${problems}. Покупателю приходится звонить и уточнять то, что могла бы показать сама картинка.

Для примера я бесплатно переработал карточку «${card}». Она во вложении.

Что это вам даст:
— Покупатель за пару секунд видит характеристики и детали товара и задаёт менеджерам меньше вопросов.
— Каталог выглядит современно, и оптовые клиенты больше ему доверяют.
— Эти же изображения подойдут для Wildberries и Ozon, если решите туда выходить.

Предлагаю переработать все карточки каталога в едином фирменном стиле:
— 170 ₽ за одно изображение. Это ниже рынка, потому что я рассчитываю на объём.
— Работаю партиями, первую сдаю за 2 дня.
— Правки в рамках выбранного стиля бесплатно.

Если интересно, сделаю ещё 2–3 карточки из разных категорий, чтобы вы оценили стиль на всём ассортименте.

Портфолио: https://konversus.ru/portfolio/timeline
Канал с разборами карточек: https://t.me/bilarius_design
Телефон: 8 (921) 201-32-52, Telegram: https://t.me/bilarius

С уважением,
Алексей Тимофеев`;
}

export function catalogLetterHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const blocks = escaped
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;line-height:1.45;">${block.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html lang="ru"><body style="margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1c1917;">${blocks}</body></html>`;
}
