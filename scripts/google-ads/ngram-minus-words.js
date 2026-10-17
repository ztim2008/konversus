/**
 * Кандидаты в минус-слова по поисковым запросам — Google Ads Script.
 *
 * Что делает: берёт поисковые запросы аккаунта за последние DAYS дней, режет их на слова и сочетания
 * из 2–3 слов, суммирует показы, клики, расход и конверсии по каждому сочетанию и пишет в Google-таблицу:
 *   «Кандидаты» — сочетания с расходом без конверсий или с очень дорогой конверсией;
 *   «1 слово», «2 слова», «3 слова» — полная статистика;
 *   «Справка» — период, пороги, когда считали.
 * Сам скрипт ничего не минусует: решение за человеком.
 *
 * Как поставить (в аккаунте клиента, бесплатно, без токена разработчика):
 *   1. Google Ads → Инструменты → Массовые действия → Скрипты → «+» → вставить этот файл целиком.
 *   2. SPREADSHEET_URL оставить пустым при первом запуске — скрипт создаст таблицу и напишет ссылку в журнал.
 *      Потом вставить эту ссылку в SPREADSHEET_URL, чтобы каждую неделю писать в ту же таблицу.
 *   3. «Авторизовать» → «Просмотр» (пробный запуск ничего не меняет) → «Запустить».
 *   4. Расписание: «Еженедельно», понедельник, 6:00.
 *
 * Ограничения: запросы Performance Max и часть редких запросов Google в search_term_view не отдаёт.
 */

var CONFIG = {
  SPREADSHEET_URL: '',
  /** Пусто — письмо не отправляется. */
  EMAIL: '',
  DAYS: 30,
  /** Только кампании, в названии которых есть эта строка. Пусто — все. */
  CAMPAIGN_NAME_CONTAINS: '',
  /** Кандидат «без конверсий»: столько кликов и больше при нуле конверсий. */
  MIN_CLICKS_NO_CONV: 5,
  /** Кандидат «дорого»: цена конверсии во столько раз выше средней по аккаунту. */
  EXPENSIVE_CPA_RATIO: 3,
  /** Сколько строк писать на листы «1/2/3 слова». */
  MAX_ROWS: 2000,
  /** Слова, которые не имеют смысла как минус-слова сами по себе. */
  STOP_WORDS: ['в', 'во', 'на', 'и', 'с', 'со', 'для', 'по', 'от', 'до', 'из', 'к', 'у', 'о', 'об', 'за', 'под', 'над', 'при', 'а', 'или', 'the', 'a', 'of', 'in', 'for', 'and', 'to'],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- точка входа, её вызывает Google Ads
function main() {
  var account = AdsApp.currentAccount();
  var tz = account.getTimeZone();
  var currency = account.getCurrencyCode();
  var range = dateRange(CONFIG.DAYS, tz);

  var terms = loadSearchTerms(range);
  var negatives = loadNegatives();
  var stop = toSet(CONFIG.STOP_WORDS);

  var totals = { clicks: 0, cost: 0, conversions: 0 };
  terms.forEach(function (t) {
    totals.clicks += t.clicks;
    totals.cost += t.cost;
    totals.conversions += t.conversions;
  });
  var accountCpa = totals.conversions > 0 ? totals.cost / totals.conversions : null;

  var byLength = {};
  for (var n = 1; n <= 3; n++) byLength[n] = aggregate(terms, n, stop);

  var candidates = [];
  for (var len = 1; len <= 3; len++) {
    byLength[len].forEach(function (g) {
      var reason = candidateReason(g, accountCpa, currency);
      if (!reason) return;
      // Длинное сочетание не нужно, если короткое внутри него покрывает те же запросы.
      var covered = candidates.some(function (s) { return s.terms === g.terms && contains(g.text, s.text); });
      if (covered) return;
      g.reason = reason;
      g.negative = negativeMark(g.text, negatives);
      candidates.push(g);
    });
  }
  candidates.sort(function (a, b) { return b.cost - a.cost; });

  var ss = openSpreadsheet();
  writeCandidates(ss, candidates, accountCpa, currency);
  writeNgrams(ss, '1 слово', byLength[1], currency);
  writeNgrams(ss, '2 слова', byLength[2], currency);
  writeNgrams(ss, '3 слова', byLength[3], currency);
  writeInfo(ss, account, range, terms.length, totals, accountCpa, currency);

  var fresh = candidates.filter(function (c) { return c.negative !== 'да'; });
  Logger.log('Запросов: ' + terms.length + ', кандидатов: ' + fresh.length + '. Таблица: ' + ss.getUrl());
  if (CONFIG.EMAIL && fresh.length) sendEmail(account, ss, fresh.slice(0, 10), currency);
}

function dateRange(days, tz) {
  var end = new Date();
  end.setDate(end.getDate() - 1);
  var start = new Date(end.getTime());
  start.setDate(start.getDate() - (days - 1));
  return {
    from: Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
    to: Utilities.formatDate(end, tz, 'yyyy-MM-dd'),
  };
}

function loadSearchTerms(range) {
  var where = "segments.date BETWEEN '" + range.from + "' AND '" + range.to + "' AND metrics.impressions > 0";
  if (CONFIG.CAMPAIGN_NAME_CONTAINS) {
    where += " AND campaign.name LIKE '%" + CONFIG.CAMPAIGN_NAME_CONTAINS.replace(/'/g, "\\'") + "%'";
  }
  var rows = AdsApp.search(
    'SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions ' +
      'FROM search_term_view WHERE ' + where
  );
  var byTerm = {};
  while (rows.hasNext()) {
    var r = rows.next();
    var text = normalize(r.searchTermView.searchTerm);
    if (!text) continue;
    var t = byTerm[text] || (byTerm[text] = { text: text, impressions: 0, clicks: 0, cost: 0, conversions: 0 });
    t.impressions += Number(r.metrics.impressions) || 0;
    t.clicks += Number(r.metrics.clicks) || 0;
    t.cost += (Number(r.metrics.costMicros) || 0) / 1e6;
    t.conversions += Number(r.metrics.conversions) || 0;
  }
  return Object.keys(byTerm).map(function (k) { return byTerm[k]; });
}

/** Тексты минус-слов кампаний, групп и списков — чтобы пометить уже заминусованное. */
function loadNegatives() {
  var out = {};
  var queries = [
    ['campaignCriterion', "SELECT campaign_criterion.keyword.text FROM campaign_criterion WHERE campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD'"],
    ['adGroupCriterion', "SELECT ad_group_criterion.keyword.text FROM ad_group_criterion WHERE ad_group_criterion.negative = TRUE AND ad_group_criterion.type = 'KEYWORD'"],
    ['sharedCriterion', "SELECT shared_criterion.keyword.text FROM shared_criterion WHERE shared_criterion.type = 'KEYWORD' AND shared_set.type = 'NEGATIVE_KEYWORDS'"],
  ];
  queries.forEach(function (q) {
    try {
      var rows = AdsApp.search(q[1]);
      while (rows.hasNext()) {
        var r = rows.next()[q[0]];
        var text = r && r.keyword ? normalize(r.keyword.text) : '';
        if (text) out[text] = true;
      }
    } catch (e) {
      Logger.log('Минус-слова (' + q[0] + ') не прочитались: ' + e);
    }
  });
  return out;
}

/** Нижний регистр, ё → е, без операторов минус-слов (+ ! [ ] ") и лишних пробелов. */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(' ');
}

/** Фраза a содержит фразу b целыми словами. */
function contains(a, b) {
  return (' ' + a + ' ').indexOf(' ' + b + ' ') >= 0;
}

/** «да» — минус-слово целиком входит в сочетание; «частично» — сочетание входит в более длинное минус-слово. */
function negativeMark(text, negatives) {
  var partial = '';
  for (var neg in negatives) {
    if (contains(text, neg)) return 'да';
    if (!partial && contains(neg, text)) partial = 'частично: «' + neg + '»';
  }
  return partial;
}

function toSet(list) {
  var s = {};
  list.forEach(function (w) { s[normalize(w)] = true; });
  return s;
}

/** Сочетание считается один раз на запрос; сочетания только из служебных слов пропускаются. */
function aggregate(terms, n, stop) {
  var map = {};
  terms.forEach(function (t) {
    var words = t.text.split(' ');
    var seen = {};
    for (var i = 0; i + n <= words.length; i++) {
      var part = words.slice(i, i + n);
      if (part.every(function (w) { return stop[w]; })) continue;
      var key = part.join(' ');
      if (seen[key]) continue;
      seen[key] = true;
      var g = map[key] || (map[key] = { text: key, terms: 0, impressions: 0, clicks: 0, cost: 0, conversions: 0 });
      g.terms++;
      g.impressions += t.impressions;
      g.clicks += t.clicks;
      g.cost += t.cost;
      g.conversions += t.conversions;
    }
  });
  return Object.keys(map)
    .map(function (k) { return map[k]; })
    .sort(function (a, b) { return b.cost - a.cost || b.clicks - a.clicks; });
}

function candidateReason(g, accountCpa, currency) {
  if (g.conversions < 0.01 && g.clicks >= CONFIG.MIN_CLICKS_NO_CONV) {
    return g.clicks + ' кликов без конверсий';
  }
  if (g.conversions < 0.01 && accountCpa && g.cost >= accountCpa) {
    return 'расход больше средней цены заявки без единой заявки';
  }
  if (g.conversions >= 0.01 && accountCpa && g.cost / g.conversions >= accountCpa * CONFIG.EXPENSIVE_CPA_RATIO) {
    return 'заявка ' + money(g.cost / g.conversions, currency) + ' при средней ' + money(accountCpa, currency);
  }
  return null;
}

function money(v, currency) {
  return (Math.round(v * 100) / 100).toLocaleString('ru-RU') + ' ' + currency;
}

function openSpreadsheet() {
  if (CONFIG.SPREADSHEET_URL) return SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  var ss = SpreadsheetApp.create('Минус-слова: ' + AdsApp.currentAccount().getName());
  Logger.log('Создана таблица — вставьте ссылку в SPREADSHEET_URL: ' + ss.getUrl());
  return ss;
}

function sheet(ss, name) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  return sh;
}

function writeTable(sh, header, rows) {
  var data = [header].concat(rows);
  sh.getRange(1, 1, data.length, header.length).setValues(data);
  sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, header.length);
}

function metricsRow(g) {
  var ctr = g.impressions ? g.clicks / g.impressions : 0;
  var cpa = g.conversions >= 0.01 ? g.cost / g.conversions : '';
  return [g.text, g.terms, g.impressions, g.clicks, round2(ctr * 100), round2(g.cost), round2(g.conversions), cpa === '' ? '' : round2(cpa)];
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function writeCandidates(ss, candidates, accountCpa, currency) {
  var sh = sheet(ss, 'Кандидаты');
  var header = ['Сочетание', 'Запросов', 'Показы', 'Клики', 'CTR, %', 'Расход, ' + currency, 'Конверсии', 'Цена конверсии', 'Почему', 'Уже в минусах'];
  var rows = candidates.map(function (g) {
    return metricsRow(g).concat([g.reason, g.negative]);
  });
  if (!rows.length) rows = [['Кандидатов нет', '', '', '', '', '', '', '', '', '']];
  writeTable(sh, header, rows);
  ss.setActiveSheet(sh);
  ss.moveActiveSheet(1);
}

function writeNgrams(ss, name, list, currency) {
  var sh = sheet(ss, name);
  var header = ['Сочетание', 'Запросов', 'Показы', 'Клики', 'CTR, %', 'Расход, ' + currency, 'Конверсии', 'Цена конверсии'];
  var rows = list.slice(0, CONFIG.MAX_ROWS).map(metricsRow);
  if (!rows.length) rows = [['Нет данных', '', '', '', '', '', '', '']];
  writeTable(sh, header, rows);
}

function writeInfo(ss, account, range, termsCount, totals, accountCpa, currency) {
  var sh = sheet(ss, 'Справка');
  var rows = [
    ['Аккаунт', account.getName() + ' (' + account.getCustomerId() + ')'],
    ['Период', range.from + ' — ' + range.to],
    ['Посчитано', Utilities.formatDate(new Date(), account.getTimeZone(), 'yyyy-MM-dd HH:mm')],
    ['Поисковых запросов', termsCount],
    ['Клики / расход / конверсии', totals.clicks + ' / ' + money(totals.cost, currency) + ' / ' + round2(totals.conversions)],
    ['Средняя цена конверсии', accountCpa ? money(accountCpa, currency) : 'конверсий нет'],
    ['Кандидат без конверсий', 'от ' + CONFIG.MIN_CLICKS_NO_CONV + ' кликов при нуле конверсий'],
    ['Кандидат «дорого»', 'цена конверсии в ' + CONFIG.EXPENSIVE_CPA_RATIO + ' раза выше средней'],
    ['Важно', 'Скрипт ничего не минусует. Перед добавлением проверьте запросы со словом во вкладке «Поисковые запросы».'],
  ];
  if (!accountCpa) {
    rows.push(['Внимание', 'За период нет конверсий: проверьте, что цели в Google Ads настроены. Кандидаты считаются только по кликам.']);
  }
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1, rows.length, 1).setFontWeight('bold');
  sh.autoResizeColumns(1, 2);
}

function sendEmail(account, ss, top, currency) {
  var lines = top.map(function (g) {
    return '• «' + g.text + '» — ' + money(g.cost, currency) + ', ' + g.reason;
  });
  MailApp.sendEmail(
    CONFIG.EMAIL,
    'Кандидаты в минус-слова: ' + account.getName(),
    'Топ кандидатов за неделю:\n\n' + lines.join('\n') + '\n\nВся таблица: ' + ss.getUrl() + '\n\nСкрипт ничего не минусует — решение за вами.'
  );
}
