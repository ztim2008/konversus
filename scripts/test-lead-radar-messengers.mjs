/**
 * Тест фактов со страницы: Telegram, Макс, WhatsApp, код платной рекламы; черновик в мессенджер (без фреймворка).
 * node scripts/test-lead-radar-messengers.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

async function load(path) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

const facts = await load("../src/lib/lead-radar/page-facts.ts");
const draft = await load("../src/lib/lead-radar/messenger-draft.ts");

// Telegram
assert.equal(facts.extractTelegram('<a href="https://t.me/stroy_master">'), "https://t.me/stroy_master");
assert.equal(facts.extractTelegram('<a href="https://t.me/share/url?url=x">'), null, "кнопка «поделиться» — не контакт");

// Макс
const maxProfile = "https://max.ru/u/f9LHodD0cOLcEBDs06CKJvYgNLDUtG5shhyHj-Vd6ZhQkV6uB5UgvlCAwlE";
assert.equal(facts.extractMax(`<a href="${maxProfile}">Макс</a>`), maxProfile);
assert.equal(facts.extractMax('<a href="https://max.ru/join/AbCdEf123456">'), "https://max.ru/join/AbCdEf123456");
assert.equal(facts.extractMax('<a href="https://max.ru/banya_spb">'), "https://max.ru/banya_spb");
assert.equal(facts.extractMax('<a href="https://max.ru/">скачать Макс</a>'), null);
assert.equal(facts.extractMax('<a href="https://max.ru/download">'), null);
assert.equal(facts.extractMax('<a href="https://maxim.ru/user">'), null, "чужой домен");

// WhatsApp
assert.equal(facts.extractWhatsapp('<a href="https://wa.me/79211234567">'), "https://wa.me/79211234567");
assert.equal(
  facts.extractWhatsapp('<a href="https://api.whatsapp.com/send?phone=+79211234567&text=hi">'),
  "https://wa.me/79211234567"
);
assert.equal(
  facts.extractWhatsapp('<a href="https://api.whatsapp.com/send?text=hi&amp;phone=79211234567">'),
  "https://wa.me/79211234567"
);
assert.equal(facts.extractWhatsapp("<p>Пишите в WhatsApp</p>"), null);

// Реклама: коллтрекинг и пиксель VK — да; РСЯ и Метрика — нет.
assert.deepEqual(
  facts.detectAdSignals('<script src="https://mod.calltouch.ru/init.js?id=abc"></script>'),
  ["Calltouch"]
);
assert.deepEqual(
  facts.detectAdSignals('<script src="//app.comagic.ru/static/cs.min.js"></script><script src="https://vk.com/rtrg?p=VK-RTRG-1"></script>'),
  ["CoMagic/UIS", "VK Реклама"]
);
assert.deepEqual(facts.detectAdSignals('<script>window.roistatProjectId = 1</script>'), ["Roistat"]);
assert.deepEqual(
  facts.detectAdSignals('<script src="https://an.yandex.ru/system/context.js"></script><div id="yandex_rtb_R-A-1"></div>'),
  [],
  "РСЯ — сайт показывает чужую рекламу, это не рекламодатель"
);
assert.deepEqual(facts.detectAdSignals('<script src="https://mc.yandex.ru/metrika/tag.js"></script>'), []);

assert.equal(facts.joinAdSignals(["Calltouch"], ["Calltouch", "VK Реклама"]), "Calltouch, VK Реклама");
assert.equal(facts.joinAdSignals([], []), null);
assert.deepEqual(facts.parseAdSignals("Calltouch, VK Реклама"), ["Calltouch", "VK Реклама"]);
assert.deepEqual(facts.parseAdSignals(null), []);

// Кнопки и черновик
assert.deepEqual(draft.messengerButtons({ telegram: "https://t.me/a_b_c", whatsapp: null }), [
  { text: "Написать в Telegram", url: "https://t.me/a_b_c" },
]);
assert.deepEqual(draft.messengerButtons({}), []);
const text = draft.buildMessengerDraft({
  senderName: "Алексей",
  domain: "banya.ru",
  email: "ivan@banya.ru",
  subject: "Сайт  banya.ru: заявки",
});
assert.equal(
  text,
  "Здравствуйте! Меня зовут Алексей.\nОтправил на ivan@banya.ru письмо «Сайт banya.ru: заявки» по сайту banya.ru.\nУдобно, если коротко продублирую сюда?"
);
assert.ok(!/konversus/i.test(text), "Konversus клиенту не упоминаем");

console.log("lead-radar messengers: OK");
