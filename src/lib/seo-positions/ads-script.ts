/** Текст Google Ads Script, который раз в день отправляет статистику кампаний в отчёт по позициям. */
export function googleAdsScript(endpoint: string, token: string): string {
  return `/**
 * Статистика рекламы для отчёта по позициям сайта.
 * Раз в день отправляет по кампаниям за последние 14 дней: показы, клики, расход, конверсии и часы показов.
 * Ничего в аккаунте не меняет. Ключ ниже — только для отправки статистики этого проекта.
 *
 * Установка: Инструменты → Массовые действия → Скрипты → «+» → вставить целиком → «Авторизовать» → «Запустить».
 * Расписание: «Ежедневно», 6:00.
 */

var ENDPOINT = ${JSON.stringify(endpoint)};
var TOKEN = ${JSON.stringify(token)};
var DAYS = 14;

function main() {
  var account = AdsApp.currentAccount();
  var tz = account.getTimeZone();
  var end = new Date();
  end.setDate(end.getDate() - 1);
  var start = new Date(end.getTime());
  start.setDate(start.getDate() - (DAYS - 1));
  var from = Utilities.formatDate(start, tz, 'yyyy-MM-dd');
  var to = Utilities.formatDate(end, tz, 'yyyy-MM-dd');
  var where = " WHERE segments.date BETWEEN '" + from + "' AND '" + to + "' AND metrics.impressions > 0";

  var byKey = {};
  var rows = AdsApp.search(
    'SELECT segments.date, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign' + where
  );
  while (rows.hasNext()) {
    var r = rows.next();
    byKey[r.segments.date + '|' + r.campaign.id] = {
      date: r.segments.date,
      campaignId: String(r.campaign.id),
      campaignName: r.campaign.name,
      impressions: Number(r.metrics.impressions) || 0,
      clicks: Number(r.metrics.clicks) || 0,
      cost: (Number(r.metrics.costMicros) || 0) / 1e6,
      conversions: Number(r.metrics.conversions) || 0,
      hours: [],
    };
  }

  var hourRows = AdsApp.search('SELECT segments.date, segments.hour, campaign.id, metrics.impressions FROM campaign' + where);
  while (hourRows.hasNext()) {
    var h = hourRows.next();
    var item = byKey[h.segments.date + '|' + h.campaign.id];
    if (item && item.hours.indexOf(Number(h.segments.hour)) < 0) item.hours.push(Number(h.segments.hour));
  }

  var list = Object.keys(byKey).map(function (k) { return byKey[k]; });
  var body = { from: from, to: to, accountName: account.getName(), currency: account.getCurrencyCode(), rows: list };
  var res = UrlFetchApp.fetch(ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TOKEN },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  Logger.log('Отправлено строк: ' + list.length + ' за ' + from + ' — ' + to + '. Ответ: ' + code + ' ' + res.getContentText());
  if (code !== 200) throw new Error('Отчёт не принял данные: ' + code + ' ' + res.getContentText());
}
`;
}
