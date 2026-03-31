/* global window, document, localStorage, location, fetch, CabinetLucide */

const API = {
  authStart: '/api/core/auth-yandex-start.php',
  me: '/api/core/me.php',
  refresh: '/api/core/auth-refresh.php',
  listings: '/api/core/listings.php',
  audit: '/api/core/audit.php',
  templates: '/api/core/templates.php',
};

const STORE = {
  access: 'acb_access_token',
  accessExp: 'acb_access_exp',
  refresh: 'acb_refresh_token',
};

function qs(sel, root = document) {
  const el = root.querySelector(sel);
  if (!el) throw new Error('Не найден элемент: ' + sel);
  return el;
}

function getRoute() {
  const h = location.hash || '#/dashboard';
  const m = h.match(/^#\/([^/?#]+)/);
  return m ? m[1] : 'dashboard';
}

function getRouteParams() {
  const h = location.hash || '';
  const idx = h.indexOf('?');
  return new URLSearchParams(idx >= 0 ? h.slice(idx + 1) : '');
}

function setActiveNav(route) {
  const items = document.querySelectorAll('[data-route]');
  items.forEach((a) => {
    if (!(a instanceof HTMLAnchorElement)) return;
    a.classList.toggle('is-active', a.dataset.route === route);
  });
}

function wantsDisabledRoute(route) {
  return ['ab', 'metrics', 'integrations', 'billing', 'settings'].includes(route);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Accept': 'application/json',
    },
  });

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const msg = (body && body.error) ? body.error : ('HTTP ' + res.status);
    const err = new Error(msg);
    err.status = res.status;
    err.payload = body;
    throw err;
  }

  return body;
}

async function authedFetchJson(url, options = {}) {
  let access = await ensureAccessToken();
  if (!access) {
    const err = new Error('Нужен вход');
    err.status = 401;
    throw err;
  }

  try {
    return await fetchJson(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: 'Bearer ' + access,
      },
    });
  } catch (e) {
    if (e && e.status === 401) {
      // Пробуем один раз обновить access и повторить запрос
      localStorage.removeItem(STORE.access);
      localStorage.removeItem(STORE.accessExp);

      access = await ensureAccessToken();
      if (!access) throw e;

      return await fetchJson(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: 'Bearer ' + access,
        },
      });
    }
    throw e;
  }
}

function storeTokens(tokens) {
  if (typeof tokens.access_token === 'string' && tokens.access_token) {
    localStorage.setItem(STORE.access, tokens.access_token);
  }
  if (typeof tokens.refresh_token === 'string' && tokens.refresh_token) {
    localStorage.setItem(STORE.refresh, tokens.refresh_token);
  }
  if (typeof tokens.access_expires_in === 'number' && Number.isFinite(tokens.access_expires_in)) {
    const exp = Date.now() + Math.max(0, tokens.access_expires_in - 30) * 1000;
    localStorage.setItem(STORE.accessExp, String(exp));
  }
}

function clearTokens() {
  localStorage.removeItem(STORE.access);
  localStorage.removeItem(STORE.accessExp);
  localStorage.removeItem(STORE.refresh);
}

function getAccessToken() {
  const t = localStorage.getItem(STORE.access);
  return (typeof t === 'string' && t.trim() !== '') ? t : null;
}

function getRefreshToken() {
  const t = localStorage.getItem(STORE.refresh);
  return (typeof t === 'string' && t.trim() !== '') ? t : null;
}

function accessExpiredSoon() {
  const raw = localStorage.getItem(STORE.accessExp);
  const exp = raw ? Number(raw) : 0;
  if (!exp) return true;
  return Date.now() >= exp;
}

async function ensureAccessToken() {
  const access = getAccessToken();
  if (access && !accessExpiredSoon()) {
    return access;
  }

  const refresh = getRefreshToken();
  if (!refresh) {
    return null;
  }

  const data = await fetchJson(API.refresh, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (data && data.success && typeof data.access_token === 'string') {
    storeTokens(data);
    return data.access_token;
  }

  return null;
}

function renderError(message) {
  const content = qs('#content');
  content.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'error';
  el.textContent = message;
  content.appendChild(el);
}

function setHeader(title, subtitle) {
  qs('#pageTitle').textContent = title;
  qs('#pageSubtitle').textContent = subtitle;
}

function setUserBox(state) {
  const userBox = qs('#userBox');
  const loginBtn = qs('#loginBtn');
  const logoutBtn = qs('#logoutBtn');

  if (!state || !state.isAuthed) {
    userBox.querySelector('.user__title').textContent = 'Не выполнен вход';
    userBox.querySelector('.user__meta').textContent = 'Войти через Яндекс ID';
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    return;
  }

  userBox.querySelector('.user__title').textContent = state.displayName || 'Пользователь';
  const role = state.isAdmin ? 'Администратор' : 'Пользователь';
  userBox.querySelector('.user__meta').textContent = state.email ? (state.email + ' • ' + role) : role;
  loginBtn.hidden = true;
  logoutBtn.hidden = false;
}

async function authStartRedirect() {
  const data = await fetchJson(API.authStart);
  if (!data || !data.success || typeof data.authorize_url !== 'string') {
    throw new Error('Не удалось получить ссылку для входа');
  }
  window.location.href = data.authorize_url;
}

function renderIcon(name, className = '', size = 18) {
  if (window.CabinetLucide && typeof window.CabinetLucide.render === 'function') {
    return window.CabinetLucide.render(name, className, size);
  }
  return '';
}

function setTopbarActions(items = []) {
  const host = qs('#topbarActions');
  host.innerHTML = '';
  items.forEach((item) => host.appendChild(item));
}

function anchorButton(label, href, options = {}) {
  const a = document.createElement('a');
  a.className = 'btn btn--icon' + (options.primary ? ' btn--primary' : '');
  a.href = href;
  a.innerHTML = renderIcon(options.icon || 'arrowRight', 'btn__icon', 16) + '<span>' + escapeHtml(label) + '</span>';
  return a;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreLabel(score) {
  if (score >= 85) return 'сильный уровень';
  if (score >= 70) return 'рабочий уровень';
  if (score >= 55) return 'есть резерв роста';
  return 'проседает';
}

function priorityLabel(level) {
  switch (level) {
    case 'critical': return 'Критический';
    case 'high': return 'Высокий';
    case 'low': return 'Низкий';
    default: return 'Средний';
  }
}

function priorityBadgeClass(level) {
  if (level === 'critical' || level === 'high') return 'badge badge--warning';
  if (level === 'low') return 'badge badge--success';
  return 'badge badge--primary';
}

function benchmarkPosition(score) {
  if (score >= 78) return 'Выше среднего';
  if (score >= 62) return 'На уровне рынка';
  return 'Ниже рынка';
}

function normalizeAuditModel(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  return {
    ...raw,
    sourceMode: raw.sourceMode || raw.source_mode || 'direct_link',
    sourceLabel: raw.sourceLabel || raw.source_label || 'Ссылка на объявление',
    serviceName: raw.serviceName || raw.service_name || 'Услуга',
    sampleSize: Number(raw.sampleSize ?? raw.sample_size ?? 0),
    overallScore: Number(raw.overallScore ?? raw.overall_score ?? 0),
    textScore: Number(raw.textScore ?? raw.text_score ?? 0),
    photoScore: Number(raw.photoScore ?? raw.photo_score ?? 0),
    infographicScore: Number(raw.infographicScore ?? raw.infographic_score ?? 0),
    benchmarkScore: Number(raw.benchmarkScore ?? raw.benchmark_score ?? 0),
    benchmarkPosition: raw.benchmarkPosition || raw.benchmark_position || benchmarkPosition(Number(raw.benchmarkScore ?? raw.benchmark_score ?? 0)),
    priorityLevel: raw.priorityLevel || raw.priority_level || 'medium',
    overallSummary: raw.overallSummary || raw.overall_summary || raw.summary || '',
    attentionRank: Number(raw.attentionRank ?? raw.attention_rank ?? 0),
    lastSyncAt: raw.lastSyncAt || raw.last_sync_at || '',
    marketGaps: Array.isArray(raw.marketGaps) ? raw.marketGaps : (Array.isArray(raw.market_gaps) ? raw.market_gaps : []),
    textItems: Array.isArray(raw.textItems) ? raw.textItems : (Array.isArray(raw.text_items) ? raw.text_items : []),
    photoItems: Array.isArray(raw.photoItems) ? raw.photoItems : (Array.isArray(raw.photo_items) ? raw.photo_items : []),
    infographicItems: Array.isArray(raw.infographicItems) ? raw.infographicItems : (Array.isArray(raw.infographic_items) ? raw.infographic_items : []),
    nextSteps: Array.isArray(raw.nextSteps) ? raw.nextSteps : (Array.isArray(raw.next_steps) ? raw.next_steps : []),
  };
}

function inferServiceName(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean).slice(0, 4);
  return words.join(' ') || 'Услуга';
}

function getDemoListing() {
  return {
    id: 'demo',
    title: 'Ремонт квартир под ключ в Москве',
    description: 'Делаем ремонт квартир под ключ. Фиксируем смету в договоре, соблюдаем сроки, даем гарантию и показываем примеры работ. Пишите, чтобы получить расчет и подбор решений под ваш бюджет.',
    status: 'active',
    template_id: '',
    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
}

function buildAuditModel(listing, options = {}) {
  const title = String((listing && listing.title) || '').trim() || 'Объявление без заголовка';
  const description = String((listing && listing.description) || '').trim();
  const sourceMode = options.sourceMode || 'direct_link';
  const sourceLabel = sourceMode === 'api_listing' ? 'Аккаунт Avito' : 'Ссылка на объявление';
  const titleLen = title.length;
  const descWords = description.split(/\s+/).filter(Boolean);
  const hasNumber = /\d/.test(title + ' ' + description);
  const hasTrust = /(гарант|опыт|лет|срок|договор|смет|кейс|пример)/i.test(description);
  const hasCta = /(звон|пиш|оставьте|закаж|свяж|получ)/i.test(description);
  const textScore = clamp(40 + (titleLen >= 24 && titleLen <= 68 ? 18 : 8) + (descWords.length >= 30 ? 9 : 4) + (hasNumber ? 6 : 0) + (hasTrust ? 7 : 0) + (hasCta ? 5 : 0), 34, 91);
  const photoScore = clamp(44 + (hasTrust ? 5 : 0) + (titleLen >= 24 ? 4 : 0) + (hasNumber ? 3 : 0), 36, 79);
  const infographicScore = clamp(40 + (hasTrust ? 6 : 0) + (hasNumber ? 5 : 0), 32, 77);
  const benchmarkScore = clamp(Math.round((textScore * 0.35) + (photoScore * 0.35) + (infographicScore * 0.20) + 8), 30, 89);
  const overallScore = clamp(Math.round((textScore * 0.45) + (photoScore * 0.30) + (infographicScore * 0.25)), 0, 100);
  const priorityLevel = overallScore < 55 ? 'critical' : overallScore < 68 ? 'high' : overallScore < 82 ? 'medium' : 'low';
  const serviceName = inferServiceName(title);
  const city = 'Москва';
  const sampleSize = 18 + (hasNumber ? 4 : 0) + (hasTrust ? 3 : 0);
  const mainWeakness = photoScore < textScore ? 'слабого первого фото' : 'недостаточно конкретного оффера';
  const overallSummary = 'Объявление проседает из-за ' + mainWeakness + ', общего позиционирования и запаса по инфографике. Сначала выровняйте визуал и первые строки текста.';

  const findings = [
    {
      severity: 'high',
      title: 'Первый экран не объясняет оффер с первого взгляда',
      description: 'Сейчас ценность объявления не считывается мгновенно. Пользователь тратит лишние секунды на понимание сути.',
      recommendation: 'Соберите главный оффер в первом фото и в первых двух строках текста.',
    },
    {
      severity: 'warning',
      title: 'Заголовок можно сделать конкретнее',
      description: 'Заголовок звучит рабоче, но ему не хватает одного сильного дифференциатора: срок, формат, гарантия или явный результат.',
      recommendation: 'Добавьте в заголовок конкретику: срок, вид услуги или ключевое отличие.',
    },
    {
      severity: 'warning',
      title: 'Инфографика должна усиливать, а не просто украшать',
      description: 'Рынок выигрывают карточки с одним главным тезисом и чистой типографикой, без перегруза текстом.',
      recommendation: 'Оставьте 1-2 визуальных акцента и уберите второстепенные подписи из первого кадра.',
    },
  ];

  const marketGaps = [
    {
      zone: 'Фото',
      gap_direction: 'below',
      gap_score: 22,
      title: 'Первый кадр слабее рыночного эталона',
      description: 'Похожим объявлениям чаще удается показать объект или результат с одного взгляда.',
      recommendation: 'Сделайте главный кадр чище: один объект, один акцент, без лишних второстепенных деталей.',
    },
    {
      zone: 'Заголовок и оффер',
      gap_direction: textScore >= 72 ? 'equal' : 'below',
      gap_score: textScore >= 72 ? 8 : 18,
      title: textScore >= 72 ? 'Вы близко к рынку по офферу' : 'Заголовок недостаточно конкретный для ниши',
      description: textScore >= 72
        ? 'Текст уже выглядит рабочим, но в сильных карточках чаще есть чуть более конкретный дифференциатор.'
        : 'У сильных карточек в этой нише обычно быстрее считывается специализация и выгода.',
      recommendation: 'Добавьте в заголовок и первый экран один измеримый плюс: срок, цена, гарантия или формат работы.',
    },
    {
      zone: 'Инфографика',
      gap_direction: infographicScore >= 68 ? 'equal' : 'below',
      gap_score: infographicScore >= 68 ? 6 : 16,
      title: infographicScore >= 68 ? 'Инфографика почти на уровне рынка' : 'Инфографику можно упростить и усилить',
      description: infographicScore >= 68
        ? 'По визуальной подаче карточка выглядит уверенно, но еще есть запас по чистоте композиции.'
        : 'В сильных объявлениях акцент чаще один, а текст на карточке короче и читается быстрее.',
      recommendation: 'Сделайте одну главную мысль на карточку и оставьте короткие тезисы без перегруза.',
    },
  ];

  const patterns = [
    'У 72% сильных карточек в этой нише первое фото показывает объект или результат без лишнего текста.',
    'В похожих объявлениях чаще работают заголовки с конкретной услугой и сроком или форматом работы.',
    'Карточки с чистой инфографикой и 1-2 тезисами визуально выигрывают у перегруженных макетов.',
  ];

  return {
    id: listing && listing.id ? String(listing.id) : 'demo',
    title,
    description,
    status: String((listing && listing.status) || 'active'),
    sourceMode,
    sourceLabel,
    serviceName,
    city,
    sampleSize,
    overallScore,
    textScore,
    photoScore,
    infographicScore,
    benchmarkScore,
    benchmarkPosition: benchmarkPosition(benchmarkScore),
    priorityLevel,
    overallSummary,
    attentionRank: listing && listing.id ? ((Number(listing.id) % 5) + 1) : 3,
    lastSyncAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    findings,
    marketGaps,
    patterns,
    textItems: [
      'Заголовок должен за один взгляд объяснять услугу и отличия.',
      'Первые строки описания стоит сократить и перенести выгоду ближе к началу.',
      'Добавьте блок доверия: гарантия, сроки, договор, кейсы или опыт.',
    ],
    photoItems: [
      'Первый кадр должен продавать, а не просто иллюстрировать тему.',
      'Оставьте один явный акцент на фото и уберите визуальный шум.',
      'Сделайте мобильную проверку: считывается ли смысл в миниатюре.',
    ],
    infographicItems: [
      'Инфографика должна усиливать оффер, а не конкурировать с ним.',
      'Используйте 1-2 коротких тезиса вместо перегруженного блока текста.',
      'Проверьте контраст и иерархию: главный тезис должен быть заметен первым.',
    ],
    nextSteps: [
      'Усилить заголовок и первый экран карточки одним конкретным обещанием.',
      'Собрать новое первое фото и короткое ТЗ на инфографику.',
      'После правок сравнить score и зафиксировать, что именно улучшилось.',
    ],
  };
}

function createAuditHero(model, isDemoMode) {
  const hero = document.createElement('section');
  hero.className = 'card audit-hero';
  hero.innerHTML = `
    <div class="audit-hero__top">
      <div>
        <div class="audit-hero__eyebrow">${renderIcon('scanSearch', '', 15)}<span>Экран аудита</span></div>
        <h2 class="audit-hero__title">${escapeHtml(model.title)}</h2>
        <div class="audit-hero__summary">${escapeHtml(model.overallSummary)}</div>
        <div class="audit-meta">
          <span class="audit-pill">${renderIcon('link2', '', 15)}${escapeHtml(model.sourceLabel)}</span>
          <span class="audit-pill">${renderIcon('mapPinned', '', 15)}${escapeHtml(model.city)} • ${escapeHtml(model.serviceName)}</span>
          <span class="${priorityBadgeClass(model.priorityLevel)}">Приоритет: ${escapeHtml(priorityLabel(model.priorityLevel))}</span>
        </div>
      </div>
      <div class="audit-hero__aside">
        <div class="audit-score-total">
          <div class="audit-score-total__label">Общий score</div>
          <div class="audit-score-total__value">${escapeHtml(String(model.overallScore))}</div>
          <div class="audit-score-total__meta">${escapeHtml(scoreLabel(model.overallScore))}</div>
        </div>
        <div class="audit-note">${isDemoMode ? 'Пока экран работает в дизайн-пилоте на локальных правилах. После подключения Data Hub здесь появятся реальные фото, benchmark и метрики.' : 'Экран уже готов для живого audit flow. Следующий шаг — подать сюда данные Data Hub и benchmark API.'}</div>
      </div>
    </div>
  `;
  return hero;
}

function createScoreCard(label, score, iconName) {
  const box = document.createElement('div');
  box.className = 'score-card';
  box.innerHTML = `
    <div class="score-card__head">
      <div>
        <div class="score-card__label">${escapeHtml(label)}</div>
        <div class="score-card__value">${escapeHtml(String(score))}</div>
      </div>
      <div class="score-card__icon">${renderIcon(iconName, '', 18)}</div>
    </div>
    <div class="score-card__status">${escapeHtml(scoreLabel(score))}</div>
  `;
  return box;
}

function createFindingsCard(item) {
  const severityBadge = item.severity === 'high'
    ? '<span class="badge badge--warning">Высокий риск</span>'
    : '<span class="badge badge--primary">Нужна правка</span>';
  const box = document.createElement('div');
  box.className = 'finding-card finding-card--' + escapeHtml(item.severity || 'warning');
  box.innerHTML = `
    <div class="finding-card__meta">
      <div class="finding-card__icon">${renderIcon('triangleAlert', '', 18)}</div>
      ${severityBadge}
    </div>
    <div class="finding-card__title">${escapeHtml(item.title)}</div>
    <div class="finding-card__text">${escapeHtml(item.description)}</div>
    <div class="finding-card__text"><strong>Что делать:</strong> ${escapeHtml(item.recommendation)}</div>
  `;
  return box;
}

function createGapCard(item) {
  const stateClass = item.gap_direction === 'above' ? 'gap-card gap-card--above' : (item.gap_direction === 'equal' ? 'gap-card gap-card--equal' : 'gap-card gap-card--below');
  const stateLabel = item.gap_direction === 'above' ? 'выше рынка' : (item.gap_direction === 'equal' ? 'на уровне рынка' : 'ниже рынка');
  const scorePrefix = item.gap_direction === 'below' ? '-' : '+';
  const box = document.createElement('div');
  box.className = stateClass;
  box.innerHTML = `
    <div class="gap-card__meta">
      <div class="gap-card__zone">${escapeHtml(item.zone)}</div>
      <div class="gap-card__score">${scorePrefix}${escapeHtml(String(item.gap_score))}</div>
    </div>
    <div class="badge ${item.gap_direction === 'below' ? 'badge--warning' : (item.gap_direction === 'above' ? 'badge--success' : 'badge--primary')}">${escapeHtml(stateLabel)}</div>
    <div class="finding-card__title">${escapeHtml(item.title)}</div>
    <div class="gap-card__text">${escapeHtml(item.description)}</div>
    <div class="gap-card__text"><strong>Действие:</strong> ${escapeHtml(item.recommendation)}</div>
  `;
  return box;
}

function createZoneCard(title, subtitle, iconName, items, previewTitle, previewSubtitle) {
  const wrap = document.createElement('section');
  wrap.className = 'card zone-card';

  const listHtml = items.map((item) => `
    <div class="zone-list__item">
      <div class="zone-list__icon">${renderIcon('checkCircle2', '', 16)}</div>
      <div class="zone-list__text">${escapeHtml(item)}</div>
    </div>
  `).join('');

  wrap.innerHTML = `
    <div class="zone-card__head">
      <div>
        <h2 class="zone-card__title">${renderIcon(iconName, '', 18)}<span>${escapeHtml(title)}</span></h2>
        <div class="zone-card__subtitle">${escapeHtml(subtitle)}</div>
      </div>
    </div>
    <div class="zone-card__preview">
      <div>
        ${renderIcon(iconName, '', 28)}
        <div class="zone-card__preview-title">${escapeHtml(previewTitle)}</div>
        <div class="zone-card__preview-subtitle">${escapeHtml(previewSubtitle)}</div>
      </div>
    </div>
    <div class="zone-list">${listHtml}</div>
  `;

  return wrap;
}

async function viewAudit(ctx) {
  setHeader('Аудит объявления', 'Текст, визуал и рыночный gap в одном экране');

  const topbarButtons = [anchorButton('К объявлениям', '#/listings', { icon: 'arrowRight' })];
  if (!ctx.access) {
    topbarButtons.unshift(anchorButton('Войти для полного Data Hub', '#/dashboard', { icon: 'link2', primary: true }));
  }
  setTopbarActions(topbarButtons);

  const content = qs('#content');
  content.innerHTML = '';

  const params = getRouteParams();
  const selectedId = params.get('id');
  let selectedListing = null;
  let isDemoMode = !ctx.access;
  let model = null;

  if (ctx.access) {
    try {
      const query = selectedId ? ('?id=' + encodeURIComponent(String(selectedId))) : '';
      const data = await authedFetchJson(API.audit + query);
      if (data && data.success && data.audit) {
        model = normalizeAuditModel(data.audit);
        selectedListing = data.listing || null;
        isDemoMode = false;
      }
    } catch {
      const data = await authedFetchJson(API.listings);
      const listings = Array.isArray(data.listings) ? data.listings : [];
      selectedListing = selectedId ? listings.find((item) => String(item.id) === String(selectedId)) || null : null;
      if (!selectedListing && listings[0]) {
        selectedListing = listings[0];
      }
      if (!selectedListing) {
        isDemoMode = true;
      }
    }
  }

  if (!model) {
    model = buildAuditModel(selectedListing || getDemoListing(), {
      sourceMode: ctx.access && !isDemoMode ? 'api_listing' : 'direct_link',
    });
  }

  content.appendChild(createAuditHero(model, isDemoMode));

  const scores = document.createElement('section');
  scores.className = 'card';
  const scoresGrid = document.createElement('div');
  scoresGrid.className = 'audit-scores';
  scoresGrid.appendChild(createScoreCard('Текст', model.textScore, 'fileText'));
  scoresGrid.appendChild(createScoreCard('Фото', model.photoScore, 'camera'));
  scoresGrid.appendChild(createScoreCard('Инфографика', model.infographicScore, 'image'));
  scoresGrid.appendChild(createScoreCard('Рынок', model.benchmarkScore, 'barChart3'));
  scores.appendChild(scoresGrid);
  content.appendChild(scores);

  const market = document.createElement('section');
  market.className = 'card';
  const gapsHtml = model.marketGaps.map((item) => '').join('');
  market.innerHTML = `
    <div class="market-gap__head">
      <div>
        <h2 class="market-gap__title">${renderIcon('barChart3', '', 18)}<span>Рыночный gap</span></h2>
        <div class="market-gap__subtitle">Сравнение с похожими объявлениями по городу и услуге</div>
      </div>
      <div>
        <span class="badge badge--primary">${escapeHtml(model.city)} • ${escapeHtml(model.serviceName)}</span>
        <span class="badge">Выборка: ${escapeHtml(String(model.sampleSize))}</span>
      </div>
    </div>
    <div class="market-gap__summary">
      ${renderIcon('target', '', 16)}
      <strong>${escapeHtml(model.benchmark_position || benchmarkPosition(model.benchmarkScore))}.</strong>
      ${escapeHtml(model.overall_summary || 'Вы ниже рынка по первому фото и конкретности оффера, но уже близки к рынку по цене и тону коммуникации.')}
    </div>
  `;

  const gapGrid = document.createElement('div');
  gapGrid.className = 'gap-grid';
  model.marketGaps.forEach((item) => gapGrid.appendChild(createGapCard(item)));
  market.appendChild(gapGrid);

  const patternList = document.createElement('div');
  patternList.className = 'pattern-list';
  model.patterns.forEach((text) => {
    const item = document.createElement('div');
    item.className = 'pattern-item';
    item.innerHTML = `<div class="pattern-item__icon">${renderIcon('sparkles', '', 16)}</div><div class="zone-list__text">${escapeHtml(text)}</div>`;
    patternList.appendChild(item);
  });
  market.appendChild(patternList);

  const actions = document.createElement('div');
  actions.className = 'action-row';
  actions.appendChild(anchorButton('Сформировать улучшенную версию', '#/listings', { icon: 'sparkles', primary: true }));
  actions.appendChild(anchorButton('ТЗ на фото', '#/audit' + (model.id ? '?id=' + encodeURIComponent(model.id) : ''), { icon: 'camera' }));
  actions.appendChild(anchorButton('ТЗ на инфографику', '#/audit' + (model.id ? '?id=' + encodeURIComponent(model.id) : ''), { icon: 'image' }));
  market.appendChild(actions);
  content.appendChild(market);

  const findings = document.createElement('section');
  findings.className = 'card';
  findings.innerHTML = `
    <div class="findings__head">
      <div>
        <h2 class="findings__title">${renderIcon('triangleAlert', '', 18)}<span>Топ-3 проблемы</span></h2>
        <div class="findings__subtitle">Сначала ответ, потом детали. Это самые важные правки прямо сейчас.</div>
      </div>
    </div>
  `;
  const findingsGrid = document.createElement('div');
  findingsGrid.className = 'findings-grid';
  model.findings.forEach((item) => findingsGrid.appendChild(createFindingsCard(item)));
  findings.appendChild(findingsGrid);
  content.appendChild(findings);

  const layout = document.createElement('section');
  layout.className = 'audit-layout';
  layout.appendChild(createZoneCard('Что проседает в тексте', 'Заголовок, первые строки, оффер и доверие', 'fileText', model.textItems, 'Текстовый резерв роста', 'Соберите выгоду выше и сократите вход в объявление.'));
  layout.appendChild(createZoneCard('Что проседает в фото', 'Первый кадр, акцент и читаемость в миниатюре', 'camera', model.photoItems, 'Первый кадр должен продавать', 'Миниатюра должна объяснять оффер без чтения длинного текста.'));
  layout.appendChild(createZoneCard('Что с инфографикой', 'Чистота, иерархия и один главный тезис', 'image', model.infographicItems, 'Инфографика как усилитель', 'Оставьте 1-2 тезиса и соберите визуальный акцент вокруг них.'));
  layout.appendChild(createZoneCard('Что делать дальше', 'Пошаговый следующий цикл после этого аудита', 'sparkles', model.nextSteps, 'Следующий спринт правок', 'Закройте главный gap, затем сравните score и переходите к новой версии.'));
  content.appendChild(layout);

  if (!ctx.access) {
    content.appendChild(card('Следующий шаг', notice('Это красивый живой пилот экрана аудита. После входа через Яндекс ID и подключения Data Hub здесь будут реальные объявления, benchmark и динамика по рынку.')));
  } else if (model && model.last_sync_at) {
    content.appendChild(card('Статус данных', notice('Audit payload получен из backend API. Последний расчет: ' + String(model.last_sync_at) + '. Следующий шаг — заменить rule-based core_listing на живой Data Hub из Avito API.')));
  }
}

function card(title, inner) {
  const el = document.createElement('div');
  el.className = 'card';
  if (title) {
    const h = document.createElement('h2');
    h.className = 'card__title';
    h.textContent = title;
    el.appendChild(h);
  }
  if (typeof inner === 'string') {
    const d = document.createElement('div');
    d.innerHTML = inner;
    el.appendChild(d);
  } else if (inner instanceof Node) {
    el.appendChild(inner);
  }
  return el;
}

function notice(text) {
  const el = document.createElement('div');
  el.className = 'notice';
  el.textContent = text;
  return el;
}

function disabledSection(route) {
  setTopbarActions([]);
  setHeader('Раздел в разработке', 'Этот раздел появится позже');
  const content = qs('#content');
  content.innerHTML = '';
  content.appendChild(card('В разработке', notice('Раздел «' + route + '» пока не реализован.')));
}

async function viewDashboard(ctx) {
  setTopbarActions([anchorButton('Открыть аудит', '#/audit', { icon: 'scanSearch', primary: true })]);
  setHeader('Обзор', 'Сводка по вашему рабочему контуру');
  const content = qs('#content');
  content.innerHTML = '';

  if (!ctx.access) {
    content.appendChild(card('Добро пожаловать', notice('Чтобы начать работу, нажмите «Войти» слева.')));
    return;
  }

  const [me, listings, templates] = await Promise.all([
    authedFetchJson(API.me),
    authedFetchJson(API.listings),
    fetchJson(API.templates),
  ]);

  const grid = document.createElement('div');
  grid.className = 'grid';

  const stats = [
    { label: 'Объявлений', value: Array.isArray(listings.listings) ? listings.listings.length : 0 },
    { label: 'Шаблонов', value: Array.isArray(templates.templates) ? templates.templates.length : 0 },
    { label: 'Аккаунт', value: (me.user && me.user.email) ? 'OK' : 'OK' },
  ];

  stats.forEach((s) => {
    const b = document.createElement('div');
    b.className = 'stat';
    const l = document.createElement('div');
    l.className = 'stat__label';
    l.textContent = s.label;
    const v = document.createElement('div');
    v.className = 'stat__value';
    v.textContent = String(s.value);
    b.appendChild(l);
    b.appendChild(v);
    grid.appendChild(b);
  });

  content.appendChild(card('Сводка', grid));

  const nextStep = document.createElement('div');
  nextStep.className = 'action-row';
  nextStep.appendChild(anchorButton('Открыть экран аудита', '#/audit', { icon: 'scanSearch', primary: true }));
  nextStep.appendChild(anchorButton('Перейти к объявлениям', '#/listings', { icon: 'arrowRight' }));

  content.appendChild(card('Следующий шаг', nextStep));
  content.appendChild(card('Статус', notice('Core MVP активен: Яндекс ID → Listings → Аудит → Templates. Следующий практический шаг: подключить Data Hub и подать сюда живые benchmark-данные.')));
}

async function viewProfile(ctx) {
  setTopbarActions([]);
  setHeader('Профиль', 'Информация о текущем пользователе');
  const content = qs('#content');
  content.innerHTML = '';

  if (!ctx.access) {
    content.appendChild(card('Нужен вход', notice('Сначала выполните вход через Яндекс ID.')));
    return;
  }

  const me = await authedFetchJson(API.me);
  const u = me.user || {};

  const table = document.createElement('table');
  table.className = 'table';
  const isAdmin = Number(u.is_admin) === 1;
  table.innerHTML = `
    <thead>
      <tr><th>Поле</th><th>Значение</th></tr>
    </thead>
    <tbody>
      <tr><td>ID</td><td><code>${escapeHtml(String(u.id || ''))}</code></td></tr>
      <tr><td>Яндекс ID</td><td><code>${escapeHtml(String(u.yandex_id || ''))}</code></td></tr>
      <tr><td>Email</td><td>${escapeHtml(String(u.email || ''))}</td></tr>
      <tr><td>Роль</td><td>${isAdmin ? '<span class="badge">Администратор</span>' : '<span class="badge">Пользователь</span>'}</td></tr>
      <tr><td>Имя</td><td>${escapeHtml(String(u.display_name || ''))}</td></tr>
      <tr><td>Реальное имя</td><td>${escapeHtml(String(u.real_name || ''))}</td></tr>
      <tr><td>Создан</td><td>${escapeHtml(String(u.created_at || ''))}</td></tr>
    </tbody>
  `;

  content.appendChild(card('Профиль', table));
}

async function viewTemplates(ctx) {
  setTopbarActions([]);
  setHeader('Шаблоны', 'Библиотека шаблонов (из таблицы templates)');
  const content = qs('#content');
  content.innerHTML = '';

  const data = await fetchJson(API.templates);
  const list = Array.isArray(data.templates) ? data.templates : [];

  if (list.length === 0) {
    content.appendChild(card('Шаблоны', notice('Шаблоны не найдены.')));
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'templates';

  list.forEach((t) => {
    const box = document.createElement('div');
    box.className = 'template';

    const img = document.createElement('img');
    img.className = 'template__img';
    img.alt = t.title ? String(t.title) : 'Шаблон';
    img.loading = 'lazy';
    img.src = normalizeUrl(String(t.thumbnail || ''));

    const body = document.createElement('div');
    body.className = 'template__body';

    const title = document.createElement('p');
    title.className = 'template__title';
    title.textContent = String(t.title || t.id || 'Шаблон');

    const meta = document.createElement('div');
    meta.className = 'template__meta';
    meta.innerHTML = `<span class="badge">ID: <code>${escapeHtml(String(t.id || ''))}</code></span>` +
      (t.category ? ` <span class="badge">${escapeHtml(String(t.category))}</span>` : '') +
      (t.status ? ` <span class="badge">${escapeHtml(String(t.status))}</span>` : '');

    body.appendChild(title);
    body.appendChild(meta);

    box.appendChild(img);
    box.appendChild(body);
    grid.appendChild(box);
  });

  content.appendChild(card('Список шаблонов', grid));
  content.appendChild(card('Как использовать', notice('Чтобы привязать шаблон к объявлению, укажите template_id при создании/обновлении объявления.')));
}

async function viewListings(ctx) {
  setTopbarActions([anchorButton('Открыть аудит', '#/audit', { icon: 'scanSearch', primary: true })]);
  setHeader('Объявления', 'Создание, редактирование и архивирование');
  const content = qs('#content');
  content.innerHTML = '';

  if (!ctx.access) {
    content.appendChild(card('Нужен вход', notice('Сначала выполните вход через Яндекс ID.')));
    return;
  }

  const [tpl, list] = await Promise.all([
    fetchJson(API.templates),
    authedFetchJson(API.listings),
  ]);

  const templates = Array.isArray(tpl.templates) ? tpl.templates : [];
  const listings = Array.isArray(list.listings) ? list.listings : [];

  let editingId = null;

  const formEl = document.createElement('form');
  formEl.className = 'form';
  formEl.innerHTML = `
    <div class="notice">Создавайте и редактируйте объявления здесь. Builder будет подключён на следующем этапе.</div>
    <div class="row">
      <div>
        <div class="label">Заголовок</div>
        <input class="input" name="title" placeholder="Например: Ремонт квартир под ключ" required />
      </div>
      <div>
        <div class="label">Шаблон (template_id)</div>
        <select class="select" name="template_id">
          <option value="">— без шаблона —</option>
        </select>
      </div>
    </div>
    <div>
      <div class="label">Описание</div>
      <textarea class="textarea" name="description" placeholder="Коротко о преимуществах, сроках, гарантиях..."></textarea>
    </div>
    <div class="row">
      <button class="btn btn--primary" type="submit" id="saveBtn">Создать</button>
      <button class="btn" type="button" id="resetBtn">Сбросить</button>
    </div>
  `;

  const sel = qs('select[name="template_id"]', formEl);
  templates.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = String(t.id || '');
    opt.textContent = String(t.title || t.id || '');
    sel.appendChild(opt);
  });

  const saveBtn = qs('#saveBtn', formEl);
  const resetBtn = qs('#resetBtn', formEl);

  function resetForm() {
    editingId = null;
    formEl.reset();
    saveBtn.textContent = 'Создать';
  }

  resetBtn.addEventListener('click', () => resetForm());

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formEl);
    const payload = {
      title: String(fd.get('title') || ''),
      description: String(fd.get('description') || ''),
    };
    const templateId = String(fd.get('template_id') || '').trim();
    if (templateId) payload.template_id = templateId;

    if (editingId) {
      await authedFetchJson(API.listings + '?id=' + encodeURIComponent(String(editingId)), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } else {
      await authedFetchJson(API.listings, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    location.hash = '#/listings';
    location.reload();
  });

  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Заголовок</th>
        <th>Шаблон</th>
        <th>Статус</th>
        <th>Обновлено</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = qs('tbody', table);
  listings.forEach((it) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${escapeHtml(String(it.id || ''))}</code></td>
      <td>${escapeHtml(String(it.title || ''))}</td>
      <td>${it.template_id ? `<code>${escapeHtml(String(it.template_id))}</code>` : '<span class="badge">—</span>'}</td>
      <td><span class="badge">${escapeHtml(String(it.status || 'draft'))}</span></td>
      <td>${escapeHtml(String(it.updated_at || ''))}</td>
      <td>
        <div class="table__actions">
        <button class="btn" type="button" data-action="edit">Редактировать</button>
        <button class="btn" type="button" data-action="audit">Аудит</button>
        <button class="btn btn--danger" type="button" data-action="archive">Архив</button>
        </div>
      </td>
    `;

    tr.querySelector('[data-action="edit"]').addEventListener('click', () => {
      editingId = it.id;
      qs('input[name="title"]', formEl).value = String(it.title || '');
      qs('textarea[name="description"]', formEl).value = String(it.description || '');
      qs('select[name="template_id"]', formEl).value = String(it.template_id || '');
      saveBtn.textContent = 'Сохранить';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    tr.querySelector('[data-action="archive"]').addEventListener('click', async () => {
      await authedFetchJson(API.listings + '?id=' + encodeURIComponent(String(it.id)), {
        method: 'DELETE',
      });
      location.hash = '#/listings';
      location.reload();
    });

    tr.querySelector('[data-action="audit"]').addEventListener('click', () => {
      location.hash = '#/audit?id=' + encodeURIComponent(String(it.id));
    });

    tbody.appendChild(tr);
  });

  content.appendChild(card('Форма объявления', formEl));
  content.appendChild(card('Ваши объявления', table));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return s;
  return '/' + s;
}

async function bootstrap() {
  const loginBtn = qs('#loginBtn');
  const logoutBtn = qs('#logoutBtn');

  loginBtn.addEventListener('click', async () => {
    try {
      await authStartRedirect();
    } catch (e) {
      renderError(e.message || String(e));
    }
  });

  logoutBtn.addEventListener('click', () => {
    clearTokens();
    location.hash = '#/dashboard';
    location.reload();
  });

  let access = null;
  let me = null;

  try {
    access = await ensureAccessToken();
    if (access) {
      const data = await authedFetchJson(API.me);
      me = data.user || null;
    }
  } catch {
    // если что-то пошло не так — просто считаем что не авторизован
    clearTokens();
    access = null;
    me = null;
  }

  setUserBox({
    isAuthed: Boolean(access),
    displayName: me && (me.display_name || me.real_name) ? String(me.display_name || me.real_name) : null,
    email: me && me.email ? String(me.email) : null,
    isAdmin: Boolean(me && Number(me.is_admin) === 1),
  });

  const route = getRoute();
  setActiveNav(route);

  const ctx = { access };

  try {
    if (wantsDisabledRoute(route)) {
      disabledSection(route);
      return;
    }

    switch (route) {
      case 'dashboard':
        await viewDashboard(ctx);
        break;
      case 'listings':
        await viewListings(ctx);
        break;
      case 'audit':
        await viewAudit(ctx);
        break;
      case 'templates':
        await viewTemplates(ctx);
        break;
      case 'profile':
        await viewProfile(ctx);
        break;
      default:
        location.hash = '#/dashboard';
        await viewDashboard(ctx);
    }
  } catch (e) {
    renderError(e.message || String(e));
  }
}

window.addEventListener('hashchange', () => location.reload());
bootstrap();
