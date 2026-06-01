/* ================================================================
   SalesDoc Builder — app.js v3
   Canvas = iframe with reference.html CSS (Avito style)
   PowerPoint drag-and-drop from left panel
================================================================ */



/* ── HELPERS ── */
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escBr(s) { return esc(s).replace(/\n/g, '<br>'); }

function setByPath(obj, path, val) {
  var p = path.split('.'), cur = obj;
  for (var i = 0; i < p.length - 1; i++) {
    if (cur[p[i]] === undefined) cur[p[i]] = {};
    cur = cur[p[i]];
  }
  cur[p[p.length - 1]] = val;
}

function getByPath(obj, path) {
  var p = path.split('.'), cur = obj;
  for (var i = 0; i < p.length; i++) {
    if (cur == null) return undefined;
    cur = cur[p[i]];
  }
  return cur;
}

// Props field helper
function pf(label, path, val, rows) {
  if (rows) {
    return '<label class="props-label">' + label +
      '<textarea class="props-textarea" data-path="' + path + '" rows="' + rows + '">' + esc(val) + '</textarea>' +
      '</label>';
  }
  return '<label class="props-label">' + label +
    '<input class="props-input" data-path="' + path + '" value="' + esc(val) + '">' +
    '</label>';
}

function pc(label, path, checked) {
  return '<label class="props-check"><input type="checkbox" data-path="' + path + '"' + (checked ? ' checked' : '') + '> <span>' + label + '</span></label>';
}

function pphone(label, path, val) {
  return '<label class="props-label">' + label +
    '<input class="props-input" data-mask="phone" data-path="' + path + '" value="' + esc(formatPhoneDisplay(val)) + '" inputmode="tel">' +
    '</label>';
}

function phoneDigits(value) {
  var digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return '7' + digits;
  if (digits.length === 11 && digits.charAt(0) === '8') return '7' + digits.slice(1);
  return digits;
}

function formatPhoneDisplay(value) {
  var digits = phoneDigits(value);
  if (digits.length === 11 && digits.charAt(0) === '7') {
    return '+7 ' + digits.slice(1, 4) + ' ' + digits.slice(4, 7) + '-' + digits.slice(7, 9) + '-' + digits.slice(9, 11);
  }
  return String(value || '');
}

function telHref(value) {
  var digits = phoneDigits(value);
  return digits ? 'tel:+' + digits : '#contacts';
}

function ensureUrl(value) {
  var url = String(value || '').trim();
  if (!url) return '';
  if (/^(https?:|tel:|mailto:|#)/i.test(url)) return url;
  if (/^@/.test(url)) return 'https://t.me/' + url.slice(1);
  return 'https://' + url;
}

function linkAttrs(href, openNew) {
  var url = ensureUrl(href) || '#contacts';
  var attrs = 'href="' + esc(url) + '"';
  if (openNew && /^https?:/i.test(url)) attrs += ' target="_blank" rel="noopener"';
  return attrs;
}

function getPrimaryActionUrl() {
  var avito = findBlock('avito');
  var contacts = findBlock('contacts');
  return (contacts && contacts.data.primaryUrl) || (avito && avito.data.url) || '#contacts';
}

function getPrimaryActionAttrs() {
  var contacts = findBlock('contacts');
  var openNew = !contacts || contacts.data.primaryNewTab !== false;
  return linkAttrs(getPrimaryActionUrl(), openNew);
}

// Section wrappers
function secWrap(id, cls, inner) {
  return '<section id="' + id + '" class="' + cls + '"><div class="container">' + inner + '</div></section>';
}
function secHeader(chip, chipColor, title, subtitle) {
  return '<div class="section-header">' +
    (chip ? '<span class="chip' + (chipColor ? ' ' + chipColor : '') + '">' + esc(chip) + '</span>' : '') +
    '<h2>' + escBr(title) + '</h2>' +
    (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') +
    '</div>';
}
var AVITO_DOTS = '<div class="avito-dots"><span></span><span></span><span></span><span></span></div>';

function sdIcon(name) {
  return '<span class="sd-icon sd-icon-' + esc(name) + '" aria-hidden="true"></span>';
}

function normalizeIcon(name, fallback) {
  var raw = String(name || '').trim();
  var aliases = {
    '🎨': 'edit', '📝': 'file', '📊': 'chart', '🔍': 'search',
    '🛡': 'shield', '⚡': 'zap', '📋': 'file', '📍': 'target',
    '💼': 'briefcase', '✓': 'check'
  };
  if (aliases[raw]) return aliases[raw];
  return /^[a-z0-9-]+$/i.test(raw) ? raw : fallback;
}

function localIcon(name, fallback) {
  return sdIcon(normalizeIcon(name, fallback || 'check'));
}

function cleanPillText(text) {
  return String(text || '').replace(/^[^A-Za-zА-Яа-яЁё0-9+]+/u, '').trim();
}

function trustPill(text, icon) {
  return '<span class="trust-pill">' + localIcon(icon, 'check') + esc(cleanPillText(text)) + '</span>';
}

function imageAlt(value, fallback) {
  return cleanPillText(value || fallback || 'Изображение профиля');
}

function lightboxImage(url, alt, cls, inner) {
  if (!url) return inner || '';
  return '<a href="' + esc(url) + '" class="' + esc(cls || 'sd-lightbox-img') + '" data-sd-lightbox="1" data-alt="' + esc(alt || '') + '">' +
    (inner || '<img src="' + esc(url) + '" alt="' + esc(alt || '') + '">') +
    '</a>';
}

function uploadControl(label, path, url, maxPx) {
  var preview = url
    ? '<div class="props-upload-preview"><img src="' + esc(url) + '" alt="' + esc(label) + '"></div>' +
      '<button class="props-remove-photo" data-clear-path="' + path + '">Удалить</button>'
    : '<label class="props-upload-btn"><span>Загрузить</span><input type="file" accept="image/*" style="display:none" data-upload-to="' + path + '" data-max-px="' + (maxPx || 900) + '"></label>';
  return '<div class="props-label">' + label + preview + '</div>';
}

function blockIcon(type) {
  var map = {
    nav: 'target', hero: 'zap', avito: 'external', stats: 'chart', services: 'briefcase', case: 'trending', gallery: 'image',
    about: 'user', process: 'clock', pricing: 'file', reviews: 'check', faq: 'message',
    'media-text': 'image',
    contacts: 'phone', cta: 'target', footer: 'file'
  };
  return sdIcon(map[type] || 'check');
}

function avitoTitleFromUrl(url) {
  try {
    var path = new URL(url).pathname.split('/').filter(Boolean);
    var last = path[path.length - 1] || 'Публичная страница Avito';
    var dict = {
      avitolog: 'авитолог', marketolog: 'маркетолог', vyvod: 'вывод', v: 'в', top: 'топ',
      i: 'и', rekomendatsii: 'рекомендации', prodvizhenie: 'продвижение', avito: 'Авито',
      reklama: 'реклама', nastroyka: 'настройка', profil: 'профиль', magazin: 'магазин'
    };
    return last.replace(/_\d+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(function(word) {
      var value = dict[word.toLowerCase()] || word;
      return value.charAt(0).toUpperCase() + value.slice(1);
    }).join(' ');
  } catch (e) {
    return 'Публичная страница Avito';
  }
}

function importAvitoUrl(url) {
  if (!url) return Promise.resolve(null);
  return fetch('/sales-doc/avito-import.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url })
  }).then(function(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error(d.error || 'Не удалось прочитать Avito');
      return d;
    });
  }).catch(function() {
    return {
      ok: false,
      blocked: true,
      url: url,
      title: avitoTitleFromUrl(url),
      description: 'Публичная страница на Avito. Ссылка сохранена, описание можно уточнить вручную.',
      imageUrl: '',
      location: '',
      source: 'avito'
    };
  });
}

function uploadImageFile(file, maxPx, kind) {
  var form = new FormData();
  form.append('image', file);
  form.append('max_px', String(maxPx || 900));
  form.append('kind', kind || 'image');
  return fetch('/sales-doc/upload.php', { method: 'POST', body: form })
    .then(function(r) {
      return r.json().then(function(d) {
        if (!r.ok || !d.url) throw new Error(d.error || 'Не удалось загрузить изображение');
        return d;
      });
    });
}

/* ── STATE ── */
var state = {
  selectedId: null,
  _nextId: 1,
  blocks: [],
  publicUrl: '',
  publishedAt: '',
  lastAudit: null,
  dirtySincePublish: false
};
var STORAGE_KEY = 'salesdoc.profile.draft.v1';
var _storageReady = false;
var _autosaveTimer = null;
var _historyUndo = [];
var _historyRedo = [];
var _isRestoringHistory = false;

function setSaveStatus(text, cls) {
  var el = document.getElementById('ed-save-status');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('is-ok', 'is-warn');
  if (cls) el.classList.add(cls);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function stateSnapshot() {
  return cloneData({
    selectedId: state.selectedId,
    _nextId: state._nextId,
    blocks: state.blocks,
    publicUrl: state.publicUrl,
    publishedAt: state.publishedAt,
    lastAudit: state.lastAudit,
    dirtySincePublish: state.dirtySincePublish,
    canvasMode: _canvasMode
  });
}

function applyStateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.blocks)) return;
  _isRestoringHistory = true;
  state.selectedId = snapshot.selectedId || null;
  state._nextId = Number(snapshot._nextId) || 1;
  state.blocks = snapshot.blocks || [];
  state.publicUrl = snapshot.publicUrl || '';
  state.publishedAt = snapshot.publishedAt || '';
  state.lastAudit = snapshot.lastAudit || null;
  state.dirtySincePublish = !!snapshot.dirtySincePublish;
  if (snapshot.canvasMode === 'mobile' || snapshot.canvasMode === 'desktop') _canvasMode = snapshot.canvasMode;
  if (!state.blocks.some(function(b) { return b.id === state.selectedId; })) {
    state.selectedId = state.blocks.length ? state.blocks[0].id : null;
  }
  renderAll();
  updateHistoryButtons();
  updateCanvasModeButtons();
  updatePreview();
  saveDraftNow();
  _isRestoringHistory = false;
}

function updateHistoryButtons() {
  var undo = document.getElementById('ed-btn-undo');
  var redo = document.getElementById('ed-btn-redo');
  if (undo) undo.disabled = !_historyUndo.length;
  if (redo) redo.disabled = !_historyRedo.length;
}

function recordHistory() {
  if (_isRestoringHistory) return;
  _historyUndo.push(stateSnapshot());
  if (_historyUndo.length > 60) _historyUndo.shift();
  _historyRedo = [];
  updateHistoryButtons();
}

function undoChange() {
  if (!_historyUndo.length) return;
  _historyRedo.push(stateSnapshot());
  applyStateSnapshot(_historyUndo.pop());
  showToast('Отменено');
}

function redoChange() {
  if (!_historyRedo.length) return;
  _historyUndo.push(stateSnapshot());
  applyStateSnapshot(_historyRedo.pop());
  showToast('Повторено');
}

function markDirty() {
  if (state.publishedAt) state.dirtySincePublish = true;
}

function updateCanvasModeButtons() {
  var desktop = document.getElementById('btn-mode-desktop');
  var mobile = document.getElementById('btn-mode-mobile');
  if (desktop) desktop.classList.toggle('active', _canvasMode === 'desktop');
  if (mobile) mobile.classList.toggle('active', _canvasMode === 'mobile');
}

function saveDraftNow() {
  if (!_storageReady) return;
  try {
    if (!state.blocks.length) {
      localStorage.removeItem(STORAGE_KEY);
      setSaveStatus('Не сохранено', 'is-warn');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: 1,
      savedAt: new Date().toISOString(),
      canvasMode: _canvasMode,
      state: state
    }));
    var status = state.publicUrl && state.dirtySincePublish ? 'Черновик сохранён · есть изменения' : 'Черновик сохранён';
    setSaveStatus(status, state.dirtySincePublish ? 'is-warn' : 'is-ok');
  } catch (e) {
    setSaveStatus('Нет автосохранения', 'is-warn');
  }
}

function copyText(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  return new Promise(function(resolve) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    resolve();
  });
}

function closeShareModal() {
  var modal = document.getElementById('share-modal');
  if (modal) modal.remove();
}

function closeAuditModal() {
  var modal = document.getElementById('audit-modal');
  if (modal) modal.remove();
}

function showAuditModal(audit, onPublish) {
  closeAuditModal();
  var data = audit && audit.data ? audit.data : audit || {};
  var score = Math.max(0, Math.min(100, parseInt(data.score || 0, 10) || 0));
  var findings = Array.isArray(data.findings) ? data.findings : [];
  var quickWins = Array.isArray(data.quickWins) ? data.quickWins : [];
  var modal = document.createElement('div');
  modal.className = 'share-modal-backdrop';
  modal.id = 'audit-modal';
  modal.innerHTML = '' +
    '<div class="share-modal-card audit-modal-card" role="dialog" aria-modal="true" aria-labelledby="audit-modal-title">' +
      '<button class="share-modal-close" type="button" aria-label="Закрыть">×</button>' +
      '<div class="share-modal-kicker">AI аудит</div>' +
      '<h2 id="audit-modal-title">Готовность профиля: ' + score + '/100</h2>' +
      '<p>' + esc(audit.note || (data.ready ? 'Профиль можно публиковать.' : 'Профиль стоит немного усилить перед отправкой.')) + '</p>' +
      '<div class="audit-score"><span style="width:' + score + '%"></span></div>' +
      '<div class="audit-list">' + findings.map(function(item) {
        return '<div class="audit-item ' + esc(item.level || 'info') + '">' +
          '<strong>' + esc(item.title || 'Замечание') + '</strong>' +
          '<p>' + esc(item.text || '') + '</p>' +
        '</div>';
      }).join('') + '</div>' +
      (quickWins.length ? '<div class="audit-wins"><strong>Быстрые улучшения</strong><ul>' + quickWins.map(function(win) { return '<li>' + esc(win) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="share-modal-actions">' +
        '<button class="share-copy" type="button">Понятно</button>' +
        (onPublish ? '<button class="share-open audit-publish" type="button">Опубликовать</button>' : '') +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.querySelector('.share-modal-close').addEventListener('click', closeAuditModal);
  modal.querySelector('.share-copy').addEventListener('click', closeAuditModal);
  if (onPublish) {
    modal.querySelector('.audit-publish').addEventListener('click', function() {
      closeAuditModal();
      onPublish();
    });
  }
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeAuditModal();
  });
}

function showShareModal(url) {
  closeShareModal();
  var modal = document.createElement('div');
  modal.className = 'share-modal-backdrop';
  modal.id = 'share-modal';
  modal.innerHTML = '' +
    '<div class="share-modal-card" role="dialog" aria-modal="true" aria-labelledby="share-modal-title">' +
      '<button class="share-modal-close" type="button" aria-label="Закрыть">×</button>' +
      '<div class="share-modal-kicker">Публикация готова</div>' +
      '<h2 id="share-modal-title">Ссылка для клиента</h2>' +
      '<p>Отправляйте её в Telegram, WhatsApp или MAX. PDF можно распечатать с этой же публичной страницы.</p>' +
      '<label class="share-link-field">' +
        '<span>Публичный URL</span>' +
        '<input value="' + esc(url) + '" readonly>' +
      '</label>' +
      '<div class="share-modal-actions">' +
        '<button class="share-copy" type="button">Скопировать</button>' +
        '<a class="share-open" href="' + esc(url) + '" target="_blank" rel="noopener">Открыть</a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  var input = modal.querySelector('input');
  input.focus();
  input.select();
  modal.querySelector('.share-copy').addEventListener('click', function() {
    copyText(url).then(function() { showToast('Ссылка скопирована'); });
  });
  modal.querySelector('.share-modal-close').addEventListener('click', closeShareModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) closeShareModal();
  });
}

function scheduleDraftSave() {
  if (!_storageReady) return;
  clearTimeout(_autosaveTimer);
  markDirty();
  setSaveStatus('Есть изменения...', 'is-warn');
  _autosaveTimer = setTimeout(saveDraftNow, 250);
}

function manualSaveDraft() {
  saveDraftNow();
  showToast('Черновик сохранён');
}

function restoreDraft() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);
    if (!data || !data.state || !Array.isArray(data.state.blocks)) return false;
    state.selectedId = data.state.selectedId || null;
    state._nextId = Number(data.state._nextId) || 1;
    state.blocks = data.state.blocks;
    state.publicUrl = data.state.publicUrl || '';
    state.publishedAt = data.state.publishedAt || '';
    state.lastAudit = data.state.lastAudit || null;
    state.dirtySincePublish = !!data.state.dirtySincePublish;
    if (data.canvasMode === 'mobile' || data.canvasMode === 'desktop') _canvasMode = data.canvasMode;
    if (!state.blocks.some(function(b) { return b.id === state.selectedId; })) {
      state.selectedId = state.blocks.length ? state.blocks[0].id : null;
    }
    updateHistoryButtons();
    setSaveStatus(state.dirtySincePublish ? 'Восстановлено · есть изменения' : 'Восстановлено', state.dirtySincePublish ? 'is-warn' : 'is-ok');
    return state.blocks.length > 0;
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function clearProject() {
  if (state.blocks.length && !confirm('Удалить текущий проект? Локальное автосохранение тоже будет очищено.')) return;
  clearTimeout(_autosaveTimer);
  localStorage.removeItem(STORAGE_KEY);
  state.selectedId = null;
  state._nextId = 1;
  state.blocks = [];
  state.publicUrl = '';
  state.publishedAt = '';
  state.lastAudit = null;
  state.dirtySincePublish = false;
  _historyUndo = [];
  _historyRedo = [];
  updateHistoryButtons();
  renderAll();
  updatePreview();
  setSaveStatus('Не сохранено', 'is-warn');
  showToast('Проект удалён');
  initWizard(true);
}

function findBlock(type) {
  return state.blocks.find(function(b) { return b.type === type; }) || null;
}

function getDocMeta() {
  var hero = findBlock('hero');
  var about = findBlock('about');
  var contacts = findBlock('contacts');
  var nav = findBlock('nav');
  var name = (about && about.data.name) || (nav && nav.data.name) || 'SalesDoc';
  var specialty = (about && about.data.tagline) || 'Продающий профиль специалиста';
  var title = hero && hero.data.title ? String(hero.data.title).replace(/\s+/g, ' ').trim() : specialty;
  var description = hero && hero.data.subtitle ? String(hero.data.subtitle).replace(/\s+/g, ' ').trim() : specialty;
  return {
    type: 'profile',
    theme: 'avito-premium',
    name: name,
    specialty: specialty,
    title: title,
    description: description.slice(0, 180),
    telegram: contacts && contacts.data.tgHandle ? contacts.data.tgHandle : '',
    phone: contacts && contacts.data.phone ? contacts.data.phone : ''
  };
}

function getAiContext() {
  var meta = getDocMeta();
  var avito = findBlock('avito');
  var contacts = findBlock('contacts');
  var hero = findBlock('hero');
  return {
    name: meta.name,
    specialty: meta.specialty,
    title: meta.title,
    description: meta.description,
    avitoUrl: (avito && avito.data.url) || '',
    city: (avito && avito.data.location) || '',
    primaryUrl: getPrimaryActionUrl(),
    telegram: (contacts && contacts.data.tgHandle) || '',
    tone: 'спокойно, экспертно, конкретно, без инфобизнеса',
    heroTitle: (hero && hero.data.title) || ''
  };
}

function deepMergeData(target, source) {
  if (!source || typeof source !== 'object') return target;
  Object.keys(source).forEach(function(key) {
    if (/^(id|type|slug|.*url|.*phone|tghandle)$/i.test(key)) return;
    var nextValue = source[key];
    if (Array.isArray(nextValue)) {
      if (Array.isArray(target[key])) {
        nextValue.forEach(function(item, index) {
          if (item && typeof item === 'object' && target[key][index] && typeof target[key][index] === 'object') {
            deepMergeData(target[key][index], item);
          } else if (item !== undefined && item !== null && (!target[key][index] || typeof target[key][index] !== 'object')) {
            target[key][index] = item;
          }
        });
      } else {
        target[key] = nextValue;
      }
    } else if (nextValue && typeof nextValue === 'object') {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      deepMergeData(target[key], nextValue);
    } else if (nextValue !== undefined && nextValue !== null) {
      target[key] = nextValue;
    }
  });
  return target;
}

function blockHasMediaFields(type) {
  return ['hero', 'avito', 'case', 'about', 'gallery', 'media-text'].indexOf(type) >= 0;
}

function aiToolbar(block) {
  var mediaBtn = blockHasMediaFields(block.type)
    ? '<button class="props-ai-btn" data-ai-action="media_seo">SEO alt</button>'
    : '';
  return '<div class="props-ai-card">' +
    '<div class="props-ai-head"><span>AI помощник</span><small>обновляет только данные блока</small></div>' +
    '<div class="props-ai-actions">' +
    '<button class="props-ai-btn is-primary" data-ai-action="block_rewrite">Улучшить блок</button>' +
    '<button class="props-ai-btn" data-ai-action="fill_empty">Заполнить пустое</button>' +
    mediaBtn +
    '</div>' +
    '<div class="props-ai-note" id="props-ai-note">Сначала можно править вручную, потом усилить AI.</div>' +
    '</div>';
}

async function runBlockAi(block, mode) {
  var note = document.getElementById('props-ai-note');
  var buttons = document.querySelectorAll('[data-ai-action]');
  buttons.forEach(function(button) { button.disabled = true; });
  if (note) note.textContent = 'AI думает над блоком...';
  showToast('AI улучшает блок...');

  try {
    var response = await fetch('/sales-doc/ai.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: mode,
        blockType: block.type,
        context: getAiContext(),
        data: block.data
      })
    });
    var result = await response.json().catch(function() { return {}; });
    if (!response.ok || !result.ok || !result.data) {
      throw new Error(result.error || 'AI не смог вернуть блок');
    }
    recordHistory();
    deepMergeData(block.data, result.data);
    renderPropsPanel(block.id);
    scheduleDraftSave();
    updatePreview();
    showToast(result.note || 'Блок улучшен');
  } catch (error) {
    if (note) note.textContent = error.message || 'AI временно недоступен';
    showToast(error.message || 'AI временно недоступен');
    buttons.forEach(function(button) { button.disabled = false; });
  }
}

function applyAiBlocks(aiBlocks) {
  if (!Array.isArray(aiBlocks)) return;
  recordHistory();
  aiBlocks.forEach(function(aiBlock) {
    if (!aiBlock || !aiBlock.type || !aiBlock.data) return;
    var block = state.blocks.find(function(item) { return item.type === aiBlock.type; });
    if (block) deepMergeData(block.data, aiBlock.data);
  });
}

function collectLinks(value, path, out) {
  out = out || [];
  path = path || '';
  if (Array.isArray(value)) {
    value.forEach(function(item, index) { collectLinks(item, path + '.' + index, out); });
    return out;
  }
  if (value && typeof value === 'object') {
    Object.keys(value).forEach(function(key) { collectLinks(value[key], path ? path + '.' + key : key, out); });
    return out;
  }
  if (typeof value !== 'string') return out;
  var text = value.trim();
  if (!text) return out;
  if (/^(https?:\/\/|mailto:|tel:|#|@)/i.test(text) || /url$/i.test(path)) out.push({ path: path, value: text });
  return out;
}

function validateProfileLinks() {
  var issues = [];
  var anchors = {
    contacts: !!findBlock('contacts'), avito: !!findBlock('avito'), services: !!findBlock('services'),
    case: !!findBlock('case'), process: !!findBlock('process'), pricing: !!findBlock('pricing'), faq: !!findBlock('faq')
  };
  collectLinks(state.blocks, 'blocks', []).forEach(function(link) {
    var value = link.value;
    if (/^@/.test(value)) return;
    if (/^\//.test(value)) return;
    if (/^#/.test(value)) {
      var anchor = value.slice(1);
      if (anchor && !anchors[anchor]) issues.push('Якорь ' + value + ' ведёт на отсутствующий блок');
      return;
    }
    if (/^tel:/i.test(value)) {
      if (phoneDigits(value).length < 10) issues.push('Телефон выглядит неполным: ' + value);
      return;
    }
    if (/^mailto:/i.test(value)) {
      if (!/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) issues.push('Некорректный email: ' + value);
      return;
    }
    if (!/^https?:\/\//i.test(value)) {
      issues.push('Ссылка без https/http: ' + value);
      return;
    }
    try { new URL(value); } catch (e) { issues.push('Некорректный URL: ' + value); }
  });
  return issues.slice(0, 8);
}

function extractSalesDocSlug(input) {
  var value = String(input || '').trim();
  if (!value) return '';
  try {
    var url = new URL(value, location.origin);
    var match = url.pathname.match(/\/sales-doc\/doc\/([a-z0-9]+)/i);
    if (match) return match[1];
  } catch (e) {}
  var raw = value.match(/[a-z0-9]{6,16}/i);
  return raw ? raw[0].toLowerCase() : '';
}

function loadPublishedProfile() {
  var input = prompt('Вставьте публичную ссылку или slug SalesDoc');
  var slug = extractSalesDocSlug(input);
  if (!slug) {
    showToast('Не нашёл slug в ссылке');
    return;
  }
  fetch('/sales-doc/load.php?slug=' + encodeURIComponent(slug))
    .then(function(r) {
      return r.json().then(function(d) {
        if (!r.ok || !d.ok) throw new Error(d.error || 'Не удалось открыть профиль');
        return d;
      });
    })
    .then(function(d) {
      state.blocks = Array.isArray(d.blocks) ? d.blocks : [];
      state._nextId = state.blocks.reduce(function(max, block) { return Math.max(max, Number(block.id) || 0); }, 0) + 1;
      state.selectedId = state.blocks.length ? state.blocks[0].id : null;
      state.publicUrl = location.origin + '/sales-doc/doc/' + d.slug;
      state.publishedAt = d.published_at || d.updated_at || new Date().toISOString();
      state.lastAudit = null;
      state.dirtySincePublish = false;
      _historyUndo = [];
      _historyRedo = [];
      renderAll();
      updateHistoryButtons();
      saveDraftNow();
      updatePreview();
      closeWizard();
      showToast('Опубликованный профиль открыт');
    })
    .catch(function(error) { showToast(error.message || 'Не удалось открыть профиль'); });
}

async function generateProfileAi(wizardContext) {
  var response = await fetch('/sales-doc/ai.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'profile_generate',
      blockType: 'profile',
      context: Object.assign({}, getAiContext(), wizardContext || {}),
      data: {
        blocks: state.blocks.map(function(block) {
          return { type: block.type, data: block.data };
        })
      }
    })
  });
  var result = await response.json().catch(function() { return {}; });
  if (!response.ok || !result.ok || !Array.isArray(result.blocks)) {
    throw new Error(result.error || 'AI не смог собрать профиль');
  }
  applyAiBlocks(result.blocks);
  return result;
}

async function runProfileAudit(options) {
  options = options || {};
  var btn = options.button || document.getElementById('ed-btn-audit');
  var buttonText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'AI аудит...'; }
  showToast('AI проверяет профиль...');
  try {
    var response = await fetch('/sales-doc/ai.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'profile_audit',
        blockType: 'profile',
        context: getAiContext(),
        data: {
          meta: getDocMeta(),
          blocks: state.blocks.map(function(block) { return { type: block.type, data: block.data }; })
        }
      })
    });
    var result = await response.json().catch(function() { return {}; });
    if (!response.ok || !result.ok || !result.data) {
      throw new Error(result.error || 'AI аудит временно недоступен');
    }
    state.lastAudit = { at: new Date().toISOString(), result: result };
    saveDraftNow();
    showAuditModal(result, options.onPublish || null);
    showToast(result.note || 'AI аудит готов');
    return result;
  } catch (error) {
    showToast(error.message || 'AI аудит временно недоступен');
    if (options.onErrorPublish) options.onErrorPublish();
    return null;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = buttonText || 'AI аудит'; }
  }
}

function buildBlocksHtml(editorMode) {
  return state.blocks.map(function(b) {
    var def = BLOCK_DEFS.find(function(d) { return d.type === b.type; });
    if (!def) return '';
    if (!editorMode) return def.renderDoc(b.data);
    var isSelected = b.id === state.selectedId;
    var sel = isSelected ? ' data-selected="1"' : '';
    return '<div data-bid="' + b.id + '"' + sel + '>' + def.renderDoc(b.data) + '</div>';
  }).join('\n');
}

/* ── BLOCK DEFINITIONS ── */
var BLOCK_DEFS = [

/* 1. NAV */
{
  type: 'nav', label: 'Навигация', icon: '🔝', singleton: true,
  defaultData: function() {

    return { name: 'Иван Проценко', ctaText: 'Бесплатный аудит' };
  },
  renderDoc: function(d) {
    return '<nav>' +
      '<div class="container"><div class="nav-inner">' +
      '<div class="nav-logo">' + AVITO_DOTS + esc(d.name) + '</div>' +
      '<ul class="nav-links">' +
      (d.showAvito ? '<li><a href="#avito">Авито</a></li>' : '') +
      '<li><a href="#services">Услуги</a></li>' +
      '<li><a href="#case">Кейс</a></li>' +
      '<li><a href="#process">Процесс</a></li>' +
      '<li><a href="#contacts">Контакты</a></li>' +
      '</ul>' +
      '<div class="nav-right">' +
      '<a ' + getPrimaryActionAttrs() + ' class="btn-nav">' + esc(d.ctaText) + '</a>' +
      '</div>' +
      '</div></div></nav>';
  },
  renderProps: function(d) {
    return '<div class="props-form">' +
      pf('Имя / Бренд', 'name', d.name) +
      pf('Кнопка CTA', 'ctaText', d.ctaText) +
      '<label class="props-label"><span><input type="checkbox" data-path="showAvito"' + (d.showAvito ? ' checked' : '') + '> Ссылка на блок Авито</span></label>' +
      '</div>';
  }
},


/* 2. HERO */
{
  type: 'hero', label: 'Герой (Hero)', icon: '🚀', singleton: true,
  defaultData: function() {
    return {
      availability: 'Беру новых клиентов в июне',
      title: 'Помогу получать\nбольше заявок с Авито\nуже через 14 дней',
      subtitle: 'Оформлю профиль, напишу объявления которые читают до конца и настрою воронку. Работаю один — вы всегда знаете с кем говорите.',
      ctaText: 'Разобрать мой Авито — бесплатно',
      cta2Text: 'Посмотреть кейс',
      badge: '✓ Авитолог с 3-летним опытом',

      trustPills: ['Возврат если нет роста', 'Отвечаю за 2 часа', 'Договор с ИП'],
      photoUrl: '',
      photoAlt: 'Фото авитолога Иван Проценко'
    };
  },
  renderDoc: function(d) {
    var photo = d.photoUrl
      ? '<img src="' + esc(d.photoUrl) + '" alt="' + esc(imageAlt(d.photoAlt, 'Фото авитолога')) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
      : '<span class="photo-placeholder">' + sdIcon('user') + '</span><span class="photo-placeholder-text">Ваше фото</span>';
    var pillIcons = ['shield', 'zap', 'file'];
    var pills = (d.trustPills || []).map(function(p, i) {
      return trustPill(p, pillIcons[i] || 'check');
    }).join('');
    return '<section id="hero" class="section-white">' +
      '<div class="container"><div class="hero-grid">' +
      '<div>' +
      '<div class="hero-label">' + esc(d.availability) + '</div>' +
      '<h1 class="hero-title">' + escBr(d.title) + '</h1>' +
      '<p class="hero-sub">' + esc(d.subtitle) + '</p>' +
      '<div class="hero-actions">' +
      '<a ' + getPrimaryActionAttrs() + ' class="btn btn-primary">' + esc(d.ctaText) + '</a>' +
      '<a ' + getPrimaryActionAttrs() + ' class="btn btn-outline">' + esc(d.cta2Text) + '</a>' +
      '</div>' +
      '<div class="hero-trust">' + pills + '</div>' +
      '</div>' +
      '<div class="hero-photo-wrap"><div class="hero-photo-outer">' +
      '<div class="deco-ring deco-ring-1"></div>' +
      '<div class="deco-ring deco-ring-2"></div>' +
      '<div class="deco-dot deco-dot-1"></div>' +
      '<div class="deco-dot deco-dot-2"></div>' +
      '<div class="deco-dot deco-dot-3"></div>' +
      '<div class="deco-dot deco-dot-4"></div>' +
      '<div class="hero-photo-inner">' + photo + '</div>' +
      '<div class="photo-badge">' + esc(d.badge) + '</div>' +
      '</div></div>' +
      '</div></div></section>';
  },
  renderProps: function(d, id) {
    var pills = (d.trustPills || []).map(function(p, i) {
      return '<div class="props-item props-item--inline">' +
        '<span class="props-item-n">' + (i+1) + '</span>' +
        '<input class="props-input" data-path="trustPills.' + i + '" value="' + esc(p) + '">' +
        '<button class="props-item-del" data-del-from="trustPills" data-del-idx="' + i + '">×</button>' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Статус / Доступность', 'availability', d.availability) +
      pf('Заголовок', 'title', d.title, 3) +
      pf('Подзаголовок', 'subtitle', d.subtitle, 3) +
      pf('Кнопка 1 (CTA)', 'ctaText', d.ctaText) +
      pf('Кнопка 2', 'cta2Text', d.cta2Text) +
      pf('Бейдж на фото', 'badge', d.badge) +
      pf('Alt фото для SEO', 'photoAlt', d.photoAlt || '') +
      '<div class="props-label">Пиллы доверия' + pills +
      '<button class="props-add-btn" data-add-to="trustPills" data-tpl="\'\'">+ Добавить</button>' +
      '</div>' +
      uploadControl('Фото профиля', 'photoUrl', d.photoUrl || '', 600) +
      '</div>';
  }
},

/* 3. AVITO */
{
  type: 'avito', label: 'Блок с Авито', icon: '🔗', singleton: true,
  defaultData: function() {
    return {
      chip: 'Профиль на Avito',
      title: 'Публичная страница Avito',
      description: 'Здесь можно показать реальную страницу специалиста на Avito: клиент видит не абстрактную презентацию, а живой публичный профиль.',
      url: '',
      location: '',
      imageUrl: '',
      imageAlt: 'Скриншот публичной страницы Avito',
      note: 'Открывается на Avito в новой вкладке',
      blocked: false
    };
  },
  renderDoc: function(d) {
    var imageAltText = imageAlt(d.imageAlt, d.title);
    var image = d.imageUrl
      ? lightboxImage(d.imageUrl, imageAltText, 'avito-proof-shot', '<img src="' + esc(d.imageUrl) + '" alt="' + esc(imageAltText) + '">')
      : '<a class="avito-proof-shot" href="' + esc(d.url || '#') + '" target="_blank" rel="noopener"><div class="avito-shot-ph">' + AVITO_DOTS + '<span>Avito</span></div></a>';
    return secWrap('avito', 'section-white',
      '<div class="avito-proof-card">' +
        '<div class="avito-proof-copy">' +
          '<span class="chip avito-chip">' + esc(d.chip || 'Профиль на Avito') + '</span>' +
          '<h2>' + esc(d.title || 'Публичная страница Avito') + '</h2>' +
          '<p>' + esc(d.description || '') + '</p>' +
          '<div class="avito-proof-meta">' +
            (d.location ? '<span>' + localIcon('target', 'target') + esc(d.location) + '</span>' : '') +
            '<span>' + localIcon('check', 'check') + 'Публичная ссылка</span>' +
            (d.blocked ? '<span>' + localIcon('shield', 'shield') + 'Можно уточнить вручную</span>' : '') +
          '</div>' +
          '<a class="avito-proof-link" href="' + esc(d.url || '#') + '" target="_blank" rel="noopener">Открыть на Avito</a>' +
          (d.note ? '<div class="avito-proof-note">' + esc(d.note) + '</div>' : '') +
        '</div>' +
        image +
      '</div>');
  },
  renderProps: function(d) {
    return '<div class="props-form">' +
      pf('Chip', 'chip', d.chip) +
      pf('Заголовок', 'title', d.title, 2) +
      pf('Описание', 'description', d.description, 4) +
      pf('Avito URL', 'url', d.url) +
      pf('Город / Регион', 'location', d.location || '') +
      uploadControl('Фото / скрин Avito', 'imageUrl', d.imageUrl || '', 1100) +
      pf('Alt картинки для SEO', 'imageAlt', d.imageAlt || '') +
      pf('Примечание', 'note', d.note || '') +
      '</div>';
  }
},

/* 4. STATS */
{
  type: 'stats', label: 'Статистика', icon: '📊', singleton: true,
  defaultData: function() {
    return { items: [
      { num: '147', color: 'blue', desc: 'клиентов получили\nрезультат' },
      { num: '+54%', color: 'green', desc: 'средний рост заявок\nза 2 недели' },
      { num: '870+', color: 'orange', desc: 'объявлений\nнаписано лично мной' },
      { num: '3 года', color: '', desc: 'работаю только\nс Авито' }
    ]};
  },
  renderDoc: function(d) {
    var cells = (d.items || []).map(function(it) {
      return '<div class="stat-cell">' +
        '<span class="stat-num ' + esc(it.color) + '">' + esc(it.num) + '</span>' +
        '<span class="stat-desc">' + escBr(it.desc) + '</span>' +
        '</div>';
    }).join('');
    return '<div id="stats"><div class="container"><div class="stats-row">' + cells + '</div></div></div>';
  },
  renderProps: function(d) {
    var items = (d.items || []).map(function(it, i) {
      return '<div class="props-item">' +
        '<div class="props-item-head"><span class="props-item-n">Ячейка ' + (i+1) + '</span></div>' +
        '<input class="props-input" data-path="items.' + i + '.num" value="' + esc(it.num) + '" placeholder="Число">' +
        '<select class="props-input" data-path="items.' + i + '.color">' +
        ['', 'blue', 'green', 'orange'].map(function(c) {
          return '<option value="' + c + '"' + (it.color === c ? ' selected' : '') + '>' + (c || 'чёрный') + '</option>';
        }).join('') +
        '</select>' +
        '<textarea class="props-textarea" data-path="items.' + i + '.desc" rows="2">' + esc(it.desc) + '</textarea>' +
        '</div>';
    }).join('');
    return '<div class="props-form">' + items + '</div>';
  }
},

/* 4. SERVICES */
{
  type: 'services', label: 'Услуги', icon: '💼', singleton: true,
  defaultData: function() {
    return {
      chip: 'Что я делаю',
      title: 'Четыре услуги — конкретные результаты',
      subtitle: 'Каждая закрывает одну задачу: вы получаете больше заявок с Авито',
      items: [
        { icon: 'edit', color: '', name: 'Оформление профиля', desc: 'Шапка, описание, фотографии. Создаю образ надёжного продавца — клиент видит и уже хочет написать.', result: '→ CTR растёт в 1.5–2×', price: 'от 4 900 ₽' },
        { icon: 'file', color: 'green', name: 'Написание объявлений', desc: 'Заголовок, описание, фото с правильными ракурсами. Пишу на языке вашей аудитории — не рекламным текстом, а живо.', result: '→ Читают в 3× чаще', price: 'от 700 ₽/шт.' },
        { icon: 'chart', color: 'orange', name: 'Ведение аккаунта', desc: 'Поднятие объявлений, A/B тесты заголовков, контроль позиций. Вы занимаетесь бизнесом — я Авито.', result: '→ 50+ объявлений под контролем', price: 'от 9 900 ₽/мес' },
        { icon: 'search', color: 'red', name: 'Аудит и стратегия', desc: 'Смотрю ваш профиль, конкурентов, спрос. Даю пошаговый план — что сделать в первую очередь.', result: '→ Plan на 30 дней', price: '2 900 ₽' }
      ]
    };
  },
  renderDoc: function(d) {
    var cards = (d.items || []).map(function(s) {
      return '<div class="svc-card">' +
        '<span class="svc-price">' + esc(s.price) + '</span>' +
        '<div class="svc-icon ' + esc(s.color) + '">' + localIcon(s.icon, 'briefcase') + '</div>' +
        '<div class="svc-name">' + esc(s.name) + '</div>' +
        '<p class="svc-desc">' + esc(s.desc) + '</p>' +
        '<span class="svc-result">' + esc(s.result) + '</span>' +
        '</div>';
    }).join('');
    return secWrap('services', 'section-bg',
      secHeader(d.chip, '', d.title, d.subtitle) +
      '<div class="services-grid">' + cards + '</div>');
  },
  renderProps: function(d, id) {
    var items = (d.items || []).map(function(s, i) {
      return '<div class="props-item">' +
        '<div class="props-item-head"><span class="props-item-n">' + s.icon + ' ' + esc(s.name) + '</span>' +
        '<button class="props-item-del" data-del-from="items" data-del-idx="' + i + '">×</button></div>' +
        '<input class="props-input" data-path="items.' + i + '.icon" value="' + esc(normalizeIcon(s.icon, 'briefcase')) + '" placeholder="SVG icon: edit, file, chart, search">' +
        '<input class="props-input" data-path="items.' + i + '.name" value="' + esc(s.name) + '" placeholder="Название">' +
        '<textarea class="props-textarea" data-path="items.' + i + '.desc" rows="2">' + esc(s.desc) + '</textarea>' +
        '<input class="props-input" data-path="items.' + i + '.result" value="' + esc(s.result) + '" placeholder="Результат">' +
        '<input class="props-input" data-path="items.' + i + '.price" value="' + esc(s.price) + '" placeholder="Цена">' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Chip', 'chip', d.chip) +
      pf('Заголовок', 'title', d.title, 2) +
      pf('Подзаголовок', 'subtitle', d.subtitle) +
      '<div class="props-label">Карточки услуг' + items +
      '<button class="props-add-btn" data-add-to="items" data-tpl=\'' +
      JSON.stringify({'icon':'briefcase','color':'','name':'Новая услуга','desc':'Описание','result':'→ Результат','price':'Цена'}).replace(/'/g,'&apos;') +
      '\'>+ Добавить услугу</button></div></div>';
  }
},

/* 5. CASE */
{
  type: 'case', label: 'Кейс', icon: '📈', singleton: false,
  defaultData: function() {
    return {
      chip: 'Кейс',
      title: 'Реальный результат клиента',
      subtitle: 'Один конкретный пример — с цифрами из кабинета Авито',
      niche: 'Стройматериалы · Екатеринбург',
      caseTitle: 'Профиль без заявок превратился в главный источник клиентов за 11 дней',
      bigStat: '×7',
      bigLabel: 'рост входящих звонков за 2 недели',
      metrics: [
        { num: '8', style: 'was', label: 'звонков/мес. было' },
        { num: '61', style: 'up', label: 'звонков/мес. стало' },
        { num: '+340%', style: 'up', label: 'рост просмотров' },
        { num: '11 дн.', style: '', label: 'срок выхода' }
      ],
      quote: '«Думал, что Авито — это доски объявлений для б/у вещей. Иван показал, как сделать из профиля полноценный продающий канал. Уже на второй неделе пришлось отказывать клиентам»',
      authorInitials: 'АК',
      authorName: 'Алексей К.',
      authorRole: 'ИП, стройматериалы, бригада 8 человек',
      imageUrl: '',
      imageAlt: 'Скриншот статистики Авито по кейсу',
      ctaText: 'Хочу такой же результат →'
    };
  },
  renderDoc: function(d) {
    var metrics = (d.metrics || []).map(function(m) {
      return '<div class="case-m">' +
        '<span class="case-m-num ' + esc(m.style) + '">' + esc(m.num) + '</span>' +
        '<span class="case-m-label">' + esc(m.label) + '</span>' +
        '</div>';
    }).join('');
    var caseImage = d.imageUrl
      ? lightboxImage(d.imageUrl, imageAlt(d.imageAlt, d.caseTitle), 'case-shot-link', '<img class="case-shot-img" src="' + esc(d.imageUrl) + '" alt="' + esc(imageAlt(d.imageAlt, d.caseTitle)) + '"><span class="case-shot-zoom">Увеличить</span>')
      : '';
    return secWrap('case', 'section-white',
      secHeader(d.chip, 'green', d.title, d.subtitle) +
      '<div class="case-featured">' +
      '<div class="case-left">' +
      '<div><span class="case-niche-tag">' + esc(d.niche) + '</span>' +
      '<h3>' + escBr(d.caseTitle) + '</h3></div>' +
      caseImage +
      '<div><div class="case-big-stat">' + esc(d.bigStat) + '</div>' +
      '<div class="case-big-label">' + esc(d.bigLabel) + '</div></div>' +
      '</div>' +
      '<div class="case-right">' +
      '<div class="case-metrics-grid">' + metrics + '</div>' +
      '<div class="case-quote">' + esc(d.quote) + '</div>' +
      '<div class="case-author">' +
      '<div class="case-ava">' + esc(d.authorInitials) + '</div>' +
      '<div><div class="case-author-name">' + esc(d.authorName) + '</div>' +
      '<div class="case-author-role">' + esc(d.authorRole) + '</div></div>' +
      '</div>' +
      '<a ' + getPrimaryActionAttrs() + ' class="more-cases-link">' + esc(d.ctaText) + '</a>' +
      '</div></div>');
  },
  renderProps: function(d) {
    var metrics = (d.metrics || []).map(function(m, i) {
      return '<div class="props-item">' +
        '<div class="props-item-head"><span class="props-item-n">Метрика ' + (i + 1) + '</span><button class="props-item-del" data-del-from="metrics" data-del-idx="' + i + '">×</button></div>' +
        '<input class="props-input" data-path="metrics.' + i + '.num" value="' + esc(m.num || '') + '" placeholder="Цифра">' +
        '<input class="props-input" data-path="metrics.' + i + '.label" value="' + esc(m.label || '') + '" placeholder="Подпись">' +
        '<input class="props-input" data-path="metrics.' + i + '.style" value="' + esc(m.style || '') + '" placeholder="style: up / was / пусто">' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Чип', 'chip', d.chip || '') +
      pf('Заголовок секции', 'title', d.title || '', 2) +
      pf('Подзаголовок секции', 'subtitle', d.subtitle || '', 2) +
      pf('Ниша / Город', 'niche', d.niche) +
      pf('Заголовок кейса', 'caseTitle', d.caseTitle, 2) +
      pf('Большая цифра', 'bigStat', d.bigStat) +
      pf('Подпись к цифре', 'bigLabel', d.bigLabel) +
      '<div class="props-label">Цифры кейса' + metrics +
      '<button class="props-add-btn" data-add-to="metrics" data-tpl=\'' +
      JSON.stringify({ num: '+0%', style: 'up', label: 'новая метрика' }).replace(/'/g, '&apos;') +
      '\'>+ Добавить метрику</button></div>' +
      pf('Цитата клиента', 'quote', d.quote, 3) +
      pf('Инициалы', 'authorInitials', d.authorInitials) +
      pf('Имя', 'authorName', d.authorName) +
      pf('Роль / Бизнес', 'authorRole', d.authorRole) +
      pf('Текст кнопки', 'ctaText', d.ctaText || '') +
      uploadControl('Фото кейса / скрин статистики', 'imageUrl', d.imageUrl || '', 1200) +
      pf('Alt фото для SEO', 'imageAlt', d.imageAlt || '') +
      '</div>';
  }
},

/* 6. GALLERY */
{
  type: 'gallery', label: 'Галерея работ', icon: '🖼', singleton: true,
  defaultData: function() {
    return {
      chip: 'Работы',
      title: 'Фото кейсов и результатов',
      subtitle: 'Скриншоты статистики, примеры оформления и реальные фрагменты работы с Авито.',
      items: [
        { imageUrl: '', title: 'Рост просмотров за неделю', caption: 'Статистика объявления после упаковки профиля', alt: 'Скриншот статистики Авито с ростом просмотров' },
        { imageUrl: '', title: 'Полученные контакты', caption: 'Контакты и обращения после запуска', alt: 'Скриншот полученных контактов в кабинете Авито' },
        { imageUrl: '', title: 'Воронка продаж', caption: 'Просмотры, контакты и избранное в динамике', alt: 'Скриншот воронки продаж Авито' }
      ]
    };
  },
  renderDoc: function(d) {
    var items = (d.items || []).map(function(item) {
      var alt = imageAlt(item.alt, item.title || item.caption || d.title);
      var image = item.imageUrl
        ? lightboxImage(item.imageUrl, alt, 'work-card-img', '<img src="' + esc(item.imageUrl) + '" alt="' + esc(alt) + '"><span class="work-zoom">Увеличить</span>')
        : '<div class="work-card-empty">' + sdIcon('image') + '<span>Добавьте фото</span></div>';
      return '<article class="work-card">' + image +
        '<div class="work-card-body">' +
        '<h3>' + esc(item.title || 'Кейс') + '</h3>' +
        (item.caption ? '<p>' + esc(item.caption) + '</p>' : '') +
        '</div></article>';
    }).join('');
    return secWrap('gallery', 'section-bg',
      secHeader(d.chip, '', d.title, d.subtitle) +
      '<div class="work-gallery-grid">' + items + '</div>');
  },
  renderProps: function(d) {
    var items = (d.items || []).map(function(item, i) {
      return '<div class="props-item">' +
        '<div class="props-item-head"><span>Работа ' + (i + 1) + '</span><button class="props-item-del" data-del-from="items" data-del-idx="' + i + '">×</button></div>' +
        uploadControl('Фото работы', 'items.' + i + '.imageUrl', item.imageUrl || '', 1200) +
        '<input class="props-input" data-path="items.' + i + '.title" value="' + esc(item.title || '') + '" placeholder="Заголовок">' +
        '<textarea class="props-textarea" data-path="items.' + i + '.caption" rows="2" placeholder="Подпись">' + esc(item.caption || '') + '</textarea>' +
        '<input class="props-input" data-path="items.' + i + '.alt" value="' + esc(item.alt || '') + '" placeholder="Alt для SEO">' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Чип', 'chip', d.chip) +
      pf('Заголовок', 'title', d.title, 2) +
      pf('Подзаголовок', 'subtitle', d.subtitle, 3) +
      '<div class="props-label">Фото работ' + items +
      '<button class="props-add-btn" data-add-to="items" data-tpl=\'' +
      JSON.stringify({ imageUrl: '', title: 'Новая работа', caption: 'Короткая подпись к кейсу', alt: 'Фото кейса Авито' }).replace(/'/g, '&apos;') +
      '\'>+ Добавить фото</button></div></div>';
  }
},

/* 7. ABOUT */
{
  type: 'about', label: 'Обо мне', icon: '🙋', singleton: true,
  defaultData: function() {
    return {
      name: 'Иван Проценко',
      tagline: 'Авитолог · Сертифицированный специалист Avito',
      text: 'Я занимаюсь только Авито — три года, каждый день. Не «ещё одна услуга в прайсе», а единственный инструмент, который я знаю досконально.\n\nРаботаю лично — без менеджеров и субподрядчиков.',
      facts: ['🎓 Сертификат Авито', '📍 Работаю по всей России', '📋 Договор с ИП', '🔄 Возврат гарантирован'],
      photoUrl: '',
      photoAlt: 'Фото специалиста по Авито'
    };
  },
  renderDoc: function(d) {
    var facts = (d.facts || []).map(function(f) {
      return '<span class="fact-chip">' + esc(f) + '</span>';
    }).join('');
    var photo = d.photoUrl
      ? '<img src="' + esc(d.photoUrl) + '" alt="' + esc(imageAlt(d.photoAlt, d.name)) + '" style="width:180px;height:180px;object-fit:cover;border-radius:50%;">'
      : '🧑\u200d💻<div class="about-cert">✓</div>';
    return secWrap('about', 'section-bg',
      '<div class="about-grid">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;">' +
      '<div class="about-photo-circle">' + photo + '</div>' +
      '</div>' +
      '<div>' +
      '<span class="chip">Обо мне</span>' +
      '<div class="about-name">' + esc(d.name) + '</div>' +
      '<div class="about-tagline">' + esc(d.tagline) + '</div>' +
      '<p class="about-text">' + escBr(d.text) + '</p>' +
      '<div class="about-facts">' + facts + '</div>' +
      '</div></div>');
  },
  renderProps: function(d, id) {
    var facts = (d.facts || []).map(function(f, i) {
      return '<div class="props-item props-item--inline">' +
        '<input class="props-input" data-path="facts.' + i + '" value="' + esc(f) + '">' +
        '<button class="props-item-del" data-del-from="facts" data-del-idx="' + i + '">×</button>' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Имя', 'name', d.name) +
      pf('Тэглайн', 'tagline', d.tagline) +
      pf('О себе', 'text', d.text, 4) +
      pf('Alt фото для SEO', 'photoAlt', d.photoAlt || '') +
      '<div class="props-label">Факты / чипы' + facts +
      '<button class="props-add-btn" data-add-to="facts" data-tpl="\'\'">+ Добавить факт</button></div>' +
      uploadControl('Фото', 'photoUrl', d.photoUrl || '', 500) + '</div>';
  }
},

/* 7.1 MEDIA + TEXT */
{
  type: 'media-text', label: 'Текст + Фото', icon: '🧩', singleton: false,
  defaultData: function() {
    return {
      chip: 'Подача',
      title: 'Покажите визуал и объясните ценность в одном экране',
      text: 'Этот блок помогает быстро показать реальные фото работ и рядом дать короткое коммерческое объяснение без перегруза.',
      imageUrl: '',
      imageAlt: 'Фото работы',
      points: [
        'Реальные фото вместо абстрактных стоков',
        'Короткий текст по сути без воды',
        'Прямая связка с контактом и следующим шагом'
      ],
      ctaText: 'Обсудить мой проект'
    };
  },
  renderDoc: function(d) {
    var points = (d.points || []).map(function(point) {
      return '<li>' + esc(point) + '</li>';
    }).join('');
    var image = d.imageUrl
      ? lightboxImage(d.imageUrl, imageAlt(d.imageAlt, d.title), 'media-text-photo', '<img src="' + esc(d.imageUrl) + '" alt="' + esc(imageAlt(d.imageAlt, d.title)) + '">')
      : '<div class="media-text-photo media-text-empty">' + sdIcon('image') + '<span>Добавьте фото</span></div>';

    return secWrap('media-text', 'section-white',
      '<div class="media-text-grid">' +
        '<div class="media-text-copy">' +
          (d.chip ? '<span class="chip">' + esc(d.chip) + '</span>' : '') +
          '<h2>' + escBr(d.title || '') + '</h2>' +
          '<p>' + escBr(d.text || '') + '</p>' +
          (points ? '<ul class="media-text-points">' + points + '</ul>' : '') +
          (d.ctaText ? '<a ' + getPrimaryActionAttrs() + ' class="btn btn-primary">' + esc(d.ctaText) + '</a>' : '') +
        '</div>' +
        '<div class="media-text-media">' + image + '</div>' +
      '</div>'
    );
  },
  renderProps: function(d) {
    var points = (d.points || []).map(function(point, i) {
      return '<div class="props-item props-item--inline">' +
        '<input class="props-input" data-path="points.' + i + '" value="' + esc(point) + '">' +
        '<button class="props-item-del" data-del-from="points" data-del-idx="' + i + '">×</button>' +
      '</div>';
    }).join('');

    return '<div class="props-form">' +
      pf('Чип', 'chip', d.chip || '') +
      pf('Заголовок', 'title', d.title || '', 2) +
      pf('Текст', 'text', d.text || '', 4) +
      uploadControl('Фото', 'imageUrl', d.imageUrl || '', 1400) +
      pf('Alt фото для SEO', 'imageAlt', d.imageAlt || '') +
      '<div class="props-label">Список тезисов' + points +
      '<button class="props-add-btn" data-add-to="points" data-tpl="\'\'">+ Добавить тезис</button></div>' +
      pf('Текст кнопки', 'ctaText', d.ctaText || '') +
      '</div>';
  }
},

/* 7. PROCESS */
{
  type: 'process', label: 'Процесс', icon: '⚙️', singleton: true,
  defaultData: function() {
    return {
      title: '4 шага от первого сообщения до результата',
      steps: [
        { title: 'Созвон 30 мин.', desc: 'Рассказываете про бизнес, я задаю вопросы.', time: 'День 1', active: false },
        { title: 'Аудит и план', desc: 'Анализирую конкурентов, спрос, профиль. Пишу план с приоритетами.', time: 'День 2–3', active: true },
        { title: 'Делаю', desc: 'Оформляю, пишу, публикую. Каждый день отчёт.', time: 'День 4–14', active: false },
        { title: 'Результат', desc: 'Смотрим итоговую статистику. Первые 30 дней — поддержка бесплатно.', time: 'День 15+', active: false }
      ]
    };
  },
  renderDoc: function(d) {
    var steps = (d.steps || []).map(function(s, i) {
      return '<div class="step">' +
        '<div class="step-circle' + (s.active ? ' active' : '') + '">' + (i+1) + '</div>' +
        '<div class="step-title">' + esc(s.title) + '</div>' +
        '<p class="step-desc">' + esc(s.desc) + '</p>' +
        '<span class="step-time">' + esc(s.time) + '</span>' +
        '</div>';
    }).join('');
    return secWrap('process', 'section-white',
      secHeader('Как работаем', '', d.title, '') +
      '<div class="process-steps">' + steps + '</div>');
  },
  renderProps: function(d) {
    var steps = (d.steps || []).map(function(s, i) {
      return '<div class="props-item">' +
        '<div class="props-item-head"><span class="props-item-n">Шаг ' + (i+1) + '</span>' +
        '<button class="props-item-del" data-del-from="steps" data-del-idx="' + i + '">×</button></div>' +
        '<input class="props-input" data-path="steps.' + i + '.title" value="' + esc(s.title) + '" placeholder="Название">' +
        '<textarea class="props-textarea" data-path="steps.' + i + '.desc" rows="2">' + esc(s.desc) + '</textarea>' +
        '<input class="props-input" data-path="steps.' + i + '.time" value="' + esc(s.time) + '" placeholder="Время">' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Заголовок', 'title', d.title, 2) +
      '<div class="props-label">Шаги' + steps +
      '<button class="props-add-btn" data-add-to="steps" data-tpl=\'' +
      JSON.stringify({'title':'Новый шаг','desc':'Описание','time':'День X','active':false}).replace(/'/g,'&apos;') +
      '\'>+ Добавить шаг</button></div></div>';
  }
},

/* 8. PRICING */
{
  type: 'pricing', label: 'Цены', icon: '💰', singleton: true,
  defaultData: function() {
    return {
      title: 'Прозрачные цены без сюрпризов',
      subtitle: 'Всё включено. Никаких «за дополнительную плату»',
      plans: [
        { name: 'Старт', badge: '', price: '9 900 ₽', period: 'разово · один запуск', features: ['Аудит профиля и конкурентов', 'Оформление профиля', '5 объявлений под ключ', 'Рекомендации по фото'], btnText: 'Выбрать Старт', isBest: false },
        { name: 'Рост', badge: 'Популярный', price: '18 900 ₽', period: 'разово · первый месяц', features: ['Всё из пакета «Старт»', 'До 20 объявлений', 'A/B тест заголовков', 'Поддержка 30 дней', 'Ежедневные отчёты'], btnText: 'Выбрать Рост', isBest: true },
        { name: 'Ведение', badge: 'Подписка', price: '24 900 ₽', period: 'в месяц · без паузы', features: ['Безлимит объявлений', 'Поднятие по расписанию', 'Мониторинг конкурентов', 'Еженедельный отчёт'], btnText: 'Выбрать Ведение', isBest: false }
      ]
    };
  },
  renderDoc: function(d) {
    var plans = (d.plans || []).map(function(p) {
      var feats = (p.features || []).map(function(f) {
        return '<li><span class="plan-check">✓</span> ' + esc(f) + '</li>';
      }).join('');
      var badgeClass = /подпис/i.test(p.badge || '') ? 'sub' : 'pop';
      return '<div class="plan' + (p.isBest ? ' best' : '') + '">' +
        '<div class="plan-top"><div class="plan-name">' + esc(p.name) + '</div>' +
        (p.badge ? '<span class="plan-badge ' + badgeClass + '">' + esc(p.badge) + '</span>' : '') +
        '</div>' +
        '<div class="plan-price"><sup>от </sup>' + esc(p.price) + '</div>' +
        '<div class="plan-period">' + esc(p.period) + '</div>' +
        '<div class="plan-divider"></div>' +
        '<ul class="plan-list">' + feats + '</ul>' +
        '<a ' + getPrimaryActionAttrs() + ' class="plan-btn' + (!p.isBest ? ' ghost' : '') + '">' + esc(p.btnText) + '</a>' +
        '</div>';
    }).join('');
    return secWrap('pricing', 'section-bg',
      secHeader('Стоимость', '', d.title, d.subtitle) +
      '<div class="pricing-grid">' + plans + '</div>');
  },
  renderProps: function(d) {
    var plans = (d.plans || []).map(function(p, i) {
      var features = (p.features || []).map(function(f, j) {
        return '<div class="props-item props-item--inline">' +
          '<input class="props-input" data-path="plans.' + i + '.features.' + j + '" value="' + esc(f) + '">' +
          '<button class="props-item-del" data-del-path="plans.' + i + '.features" data-del-idx="' + j + '">×</button>' +
          '</div>';
      }).join('');
      return '<div class="props-item">' +
        '<div class="props-item-head"><span class="props-item-n">' + esc(p.name) + '</span>' +
        '<button class="props-item-del" data-del-from="plans" data-del-idx="' + i + '">×</button></div>' +
        '<input class="props-input" data-path="plans.' + i + '.name" value="' + esc(p.name) + '" placeholder="Название">' +
        '<input class="props-input" data-path="plans.' + i + '.badge" value="' + esc(p.badge || '') + '" placeholder="Бейдж: Популярный / Подписка">' +
        '<input class="props-input" data-path="plans.' + i + '.price" value="' + esc(p.price) + '" placeholder="Цена">' +
        '<input class="props-input" data-path="plans.' + i + '.period" value="' + esc(p.period) + '" placeholder="Период">' +
        '<input class="props-input" data-path="plans.' + i + '.btnText" value="' + esc(p.btnText || '') + '" placeholder="Текст кнопки">' +
        pc('Выделить тариф как основной', 'plans.' + i + '.isBest', !!p.isBest) +
        '<div class="props-label">Пункты тарифа' + features +
        '<button class="props-add-btn" data-add-path="plans.' + i + '.features" data-tpl="\'Новый пункт\'">+ Добавить пункт</button></div>' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Заголовок', 'title', d.title) +
      pf('Подзаголовок', 'subtitle', d.subtitle) +
      '<div class="props-label">Тарифы' + plans +
      '<button class="props-add-btn" data-add-to="plans" data-tpl=\'' +
      JSON.stringify({ name: 'Новый тариф', badge: '', price: '0 ₽', period: 'разово', features: ['Первый пункт'], btnText: 'Выбрать', isBest: false }).replace(/'/g, '&apos;') +
      '\'>+ Добавить тариф</button></div></div>';
  }
},

/* 9. REVIEWS */
{
  type: 'reviews', label: 'Отзывы', icon: '⭐', singleton: true,
  defaultData: function() {
    return {
      title: 'Что говорят клиенты',
      items: [
        { text: '«Не верила, что Авито работает для клининга. Иван сделал профиль — через 10 дней получила первый заказ на 12 000 ₽. Сейчас Авито даёт 30% заявок ежемесячно»', name: 'Ольга Л.', city: 'Клининг · Новосибирск', initials: 'ОЛ', grad: 'linear-gradient(135deg,#ec4899,#7c3aed)' },
        { text: '«Раньше получал отчёты где ничего не понятно. Иван сразу показал цифры: было 4 просмотра в день, стало 38. Понятно, прозрачно, честно»', name: 'Роман М.', city: 'Мебель · Тюмень', initials: 'РМ', grad: 'linear-gradient(135deg,#0077FF,#3846e7)' },
        { text: '«За 2 недели — очередь на 3 дня вперёд. Такого не было за 5 лет»', name: 'Андрей В.', city: 'Ремонт телефонов · Самара', initials: 'АВ', grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' }
      ]
    };
  },
  renderDoc: function(d) {
    var reviews = (d.items || []).map(function(r) {
      return '<div class="review">' +
        '<div class="review-stars">★★★★★</div>' +
        '<p class="review-text">' + esc(r.text) + '</p>' +
        '<div class="review-author">' +
        '<div class="review-ava" style="background:' + r.grad + '">' + esc(r.initials) + '</div>' +
        '<div><div class="review-name">' + esc(r.name) + '</div>' +
        '<div class="review-city">' + esc(r.city) + '</div></div>' +
        '</div></div>';
    }).join('');
    return secWrap('reviews', 'section-white',
      secHeader('Отзывы', 'green', d.title, '') +
      '<div class="reviews-grid">' + reviews + '</div>');
  },
  renderProps: function(d, id) {
    var items = (d.items || []).map(function(r, i) {
      return '<div class="props-item">' +
        '<div class="props-item-head"><span class="props-item-n">' + esc(r.name) + '</span>' +
        '<button class="props-item-del" data-del-from="items" data-del-idx="' + i + '">×</button></div>' +
        '<textarea class="props-textarea" data-path="items.' + i + '.text" rows="3">' + esc(r.text) + '</textarea>' +
        '<input class="props-input" data-path="items.' + i + '.name" value="' + esc(r.name) + '" placeholder="Имя">' +
        '<input class="props-input" data-path="items.' + i + '.city" value="' + esc(r.city) + '" placeholder="Ниша · Город">' +
        '<input class="props-input" data-path="items.' + i + '.initials" value="' + esc(r.initials) + '" placeholder="Инициалы">' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Заголовок', 'title', d.title) +
      '<div class="props-label">Отзывы' + items +
      '<button class="props-add-btn" data-add-to="items" data-tpl=\'' +
      JSON.stringify({'text':'«Текст отзыва»','name':'Имя Ф.','city':'Ниша · Город','initials':'ИФ','grad':'linear-gradient(135deg,#00AAFF,#59BE78)'}).replace(/'/g,'&apos;') +
      '\'>+ Добавить отзыв</button></div></div>';
  }
},

/* 10. FAQ */
{
  type: 'faq', label: 'FAQ', icon: '❓', singleton: true,
  defaultData: function() {
    return {
      title: 'Частые вопросы',
      items: [
        { q: 'Когда будет результат?', a: 'Первые обращения обычно идут на 3–7 день после публикации. Устойчивый рост виден через 2–3 недели.' },
        { q: 'Гарантируете ли вы результат?', a: 'Гарантирую рост просмотров минимум на 20% за 14 дней — прописано в договоре. Если не произошло — полный возврат.' },
        { q: 'Нужно ли давать доступ к аккаунту?', a: 'Для ведения — да, нужен доступ. Для разовых услуг — доступ не нужен, публикуете сами по моим материалам.' }
      ]
    };
  },
  renderDoc: function(d) {
    var items = (d.items || []).map(function(it, i) {
      return '<div class="faq-item' + (i === 0 ? ' open' : '') + '">' +
        '<div class="faq-q" role="button" tabindex="0" data-faq-toggle="1">' + esc(it.q) +
        '<span class="faq-icon">+</span></div>' +
        '<div class="faq-a">' + esc(it.a) + '</div>' +
        '</div>';
    }).join('');
    return secWrap('faq', 'section-bg',
      secHeader('FAQ', '', d.title, '') +
      '<div class="faq-wrap">' + items + '</div>');
  },
  renderProps: function(d, id) {
    var items = (d.items || []).map(function(it, i) {
      return '<div class="props-item">' +
        '<div class="props-item-head"><span class="props-item-n">Вопрос ' + (i+1) + '</span>' +
        '<button class="props-item-del" data-del-from="items" data-del-idx="' + i + '">×</button></div>' +
        '<input class="props-input" data-path="items.' + i + '.q" value="' + esc(it.q) + '" placeholder="Вопрос">' +
        '<textarea class="props-textarea" data-path="items.' + i + '.a" rows="2">' + esc(it.a) + '</textarea>' +
        '</div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Заголовок', 'title', d.title) +
      '<div class="props-label">Вопросы и ответы' + items +
      '<button class="props-add-btn" data-add-to="items" data-tpl=\'' +
      JSON.stringify({'q':'Новый вопрос?','a':'Ответ на вопрос.'}).replace(/'/g,'&apos;') +
      '\'>+ Добавить вопрос</button></div></div>';
  }
},

/* 11. CONTACTS */
{
  type: 'contacts', label: 'Контакты', icon: '📞', singleton: true,
  defaultData: function() {
    return {
      title: 'Свяжитесь удобным способом',
      subtitle: 'Telegram предпочтительнее — отвечаю там быстрее всего',
      primaryUrl: '',
      primaryNewTab: true,
      tgHandle: 'avitolog',
      tgUrl: '',
      tgNewTab: true,
      maxPhone: '',
      maxUrl: '',
      maxNewTab: true,
      phone: '',
      phoneUrl: '',
      phoneNewTab: false,
      waPhone: '',
      waUrl: '',
      waNewTab: true,
      trust: ['Отвечаю за 2 часа в рабочее время', 'Работаю удалённо по всей России', 'Договор с ИП · Закрывающие документы']
    };
  },
  renderDoc: function(d) {
    var trustIcons = ['zap', 'target', 'file'];
    var trust = (d.trust || []).map(function(t, i) {
      return trustPill(t, trustIcons[i] || 'check');
    }).join('');
    var tgHref = d.tgUrl ? ensureUrl(d.tgUrl) : (d.tgHandle ? 'https://t.me/' + String(d.tgHandle).replace(/^@/, '') : '#contacts');
    var maxHref = d.maxUrl ? ensureUrl(d.maxUrl) : telHref(d.maxPhone);
    var phoneHref = d.phoneUrl ? ensureUrl(d.phoneUrl) : telHref(d.phone);
    var waDigits = phoneDigits(d.waPhone || d.phone);
    var waHref = d.waUrl ? ensureUrl(d.waUrl) : (waDigits ? 'https://wa.me/' + waDigits : '#contacts');
    return secWrap('contacts', 'section-white',
      secHeader('Контакты', '', d.title, d.subtitle) +
      '<div class="contacts-grid">' +
      '<a ' + linkAttrs(tgHref, d.tgNewTab !== false) + ' class="contact-card contact-tg">' +
      '<div class="contact-icon">' + sdIcon('message') + '</div>' +
      '<div class="contact-name">Telegram</div>' +
      '<div class="contact-val">' + (d.tgHandle ? '@' + esc(String(d.tgHandle).replace(/^@/, '')) : 'Укажите Telegram') + '</div>' +
      '<span class="contact-action">Написать в Telegram →</span></a>' +
      '<a ' + linkAttrs(maxHref, d.maxNewTab === true) + ' class="contact-card contact-max">' +
      '<div class="contact-icon">' + sdIcon('smartphone') + '</div>' +
      '<div class="contact-name">MAX</div>' +
      '<div class="contact-val">' + (d.maxPhone ? esc(formatPhoneDisplay(d.maxPhone)) : 'Укажите MAX') + '</div>' +
      '<span class="contact-action">Связаться →</span></a>' +
      '<a ' + linkAttrs(phoneHref, d.phoneNewTab === true) + ' class="contact-card contact-phone">' +
      '<div class="contact-icon">' + sdIcon('phone') + '</div>' +
      '<div class="contact-name">Звонок</div>' +
      '<div class="contact-val">' + (d.phone ? esc(formatPhoneDisplay(d.phone)) : 'Укажите телефон') + '</div>' +
      '<span class="contact-action">Позвонить →</span></a>' +
      '<a ' + linkAttrs(waHref, d.waNewTab !== false) + ' class="contact-card contact-wa">' +
      '<div class="contact-icon">' + sdIcon('message') + '</div>' +
      '<div class="contact-name">WhatsApp</div>' +
      '<div class="contact-val">' + ((d.waPhone || d.phone) ? esc(formatPhoneDisplay(d.waPhone || d.phone)) : 'Укажите WhatsApp') + '</div>' +
      '<span class="contact-action">Написать →</span></a>' +
      '</div>' +
      '<div class="contacts-trust">' + trust + '</div>');
  },
  renderProps: function(d, id) {
    var trust = (d.trust || []).map(function(t, i) {
      return '<div class="props-item props-item--inline">' +
        '<input class="props-input" data-path="trust.' + i + '" value="' + esc(t) + '">' +
        '<button class="props-item-del" data-del-from="trust" data-del-idx="' + i + '">×</button></div>';
    }).join('');
    return '<div class="props-form">' +
      pf('Заголовок', 'title', d.title) +
      pf('Подзаголовок', 'subtitle', d.subtitle) +
        pf('Главная ссылка для кнопок', 'primaryUrl', d.primaryUrl || '') +
        pc('Открывать главные кнопки в новом окне', 'primaryNewTab', d.primaryNewTab !== false) +
      pf('Telegram (без @)', 'tgHandle', d.tgHandle) +
        pf('Telegram ссылка', 'tgUrl', d.tgUrl || '') +
        pc('Telegram в новом окне', 'tgNewTab', d.tgNewTab !== false) +
        pphone('MAX / телефон', 'maxPhone', d.maxPhone || '') +
        pf('MAX ссылка', 'maxUrl', d.maxUrl || '') +
        pc('MAX в новом окне', 'maxNewTab', d.maxNewTab === true) +
        pphone('Телефон', 'phone', d.phone || '') +
        pf('Ссылка для звонка', 'phoneUrl', d.phoneUrl || '') +
        pc('Телефон в новом окне', 'phoneNewTab', d.phoneNewTab === true) +
        pphone('WhatsApp телефон', 'waPhone', d.waPhone || d.phone || '') +
        pf('WhatsApp ссылка', 'waUrl', d.waUrl || '') +
        pc('WhatsApp в новом окне', 'waNewTab', d.waNewTab !== false) +
      '<div class="props-label">Доверительные пиллы' + trust +
      '<button class="props-add-btn" data-add-to="trust" data-tpl="\'\'">+ Добавить</button></div></div>';
  }
},

/* 12. CTA */
{
  type: 'cta', label: 'CTA / Призыв', icon: '🎯', singleton: true,
  defaultData: function() {
    return {
      chip: 'Следующий шаг',
      title: 'Разберу ваш Авито\nбесплатно — за 24 часа',
      subtitle: 'Присылаете ссылку на профиль — получаете конкретный разбор: что мешает заявкам и что сделать в первую очередь.',
      btnText: 'Получить бесплатный аудит',
      tgHandle: 'avitolog',
      note: 'Отвечаю за 2 часа · Беру 3–5 клиентов в месяц · Договор с ИП'
    };
  },
  renderDoc: function(d) {
    return '<section id="cta-final">' +
      '<div class="container">' +
      '<span class="cta-chip">' + esc(d.chip) + '</span>' +
      '<h2>' + escBr(d.title) + '</h2>' +
      '<p class="cta-sub">' + esc(d.subtitle) + '</p>' +
      '<div class="cta-btns">' +
      '<a ' + getPrimaryActionAttrs() + ' class="btn-white">' + esc(d.btnText) + '</a>' +
      '<a ' + getPrimaryActionAttrs() + ' class="btn-tg">' + sdIcon('external') + ' Открыть профиль</a>' +
      '</div>' +
      '<p class="cta-note">' + esc(d.note) + '</p>' +
      '</div></section>';
  },
  renderProps: function(d) {
    return '<div class="props-form">' +
      pf('Чип', 'chip', d.chip) +
      pf('Заголовок', 'title', d.title, 2) +
      pf('Подзаголовок', 'subtitle', d.subtitle, 3) +
      pf('Кнопка', 'btnText', d.btnText) +
      pf('Telegram (без @)', 'tgHandle', d.tgHandle) +
      pf('Примечание', 'note', d.note) +
      '</div>';
  }
},

/* 13. FOOTER */
{
  type: 'footer', label: 'Подвал', icon: '🔚', singleton: true,
  defaultData: function() {
    return {
      name: 'Иван Проценко',
      ogrnip: '000000000000000',
      tgHandle: 'avitolog'
    };
  },
  renderDoc: function(d) {
    return '<footer>' +
      '<div class="container"><div class="footer-inner">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
      AVITO_DOTS +
      '<span class="footer-copy">© 2026 ' + esc(d.name) + ' · Авитолог · ИП · ОГРНИП ' + esc(d.ogrnip) + '</span>' +
      '</div>' +
      '<ul class="footer-links">' +
      '<li><a href="#">Договор оферты</a></li>' +
      '<li><a href="#">Конфиденциальность</a></li>' +
      '<li><a href="https://t.me/' + esc(d.tgHandle) + '">Telegram</a></li>' +
      '</ul>' +
      '</div></div></footer>';
  },
  renderProps: function(d) {
    return '<div class="props-form">' +
      pf('Имя / Бренд', 'name', d.name) +
      pf('ОГРНИП', 'ogrnip', d.ogrnip) +
      pf('Telegram (без @)', 'tgHandle', d.tgHandle) +
      '</div>';
  }
}

]; // END BLOCK_DEFS

/* ── IFRAME: BUILD FULL HTML ── */
function buildFullHtml() {
  var blocksHtml = buildBlocksHtml(true);

  var iframeScript =
    'window.addEventListener("load",function(){' +
    '  parent.postMessage({t:"resize",h:document.documentElement.scrollHeight},"*");' +
    '  new MutationObserver(function(){' +
    '    parent.postMessage({t:"resize",h:document.documentElement.scrollHeight},"*");' +
    '  }).observe(document.body,{childList:true,subtree:true,characterData:true});' +
    '});' +
    'document.addEventListener("click",function(e){' +
    '  var lb=e.target.closest("[data-sd-lightbox]");' +
    '  if(lb){e.preventDefault();openSdLightbox(lb.getAttribute("href"),lb.dataset.alt||"");return;}' +
    '  var fq=e.target.closest("[data-faq-toggle]");' +
    '  if(fq){e.preventDefault();toggleFaq(fq);return;}' +
    '  var b=e.target.closest("[data-bid]");' +
    '  if(b) parent.postMessage({t:"select",id:+b.dataset.bid},"*");' +
    '});' +
    'function openSdLightbox(src,alt){' +
    '  var old=document.querySelector(".sd-lightbox");if(old)old.remove();' +
    '  var el=document.createElement("div");el.className="sd-lightbox";' +
    '  var btn=document.createElement("button");btn.className="sd-lightbox-close";btn.setAttribute("aria-label","Закрыть");btn.textContent="×";' +
    '  var fig=document.createElement("figure");var img=document.createElement("img");var cap=document.createElement("figcaption");' +
    '  img.src=src;img.alt=alt||"";cap.textContent=alt||"";fig.appendChild(img);fig.appendChild(cap);el.appendChild(btn);el.appendChild(fig);' +
    '  el.addEventListener("click",function(ev){if(ev.target===el||ev.target.className==="sd-lightbox-close")el.remove();});' +
    '  document.body.appendChild(el);' +
    '}' +
    'function toggleFaq(el){' +
    '  var item=el.closest(".faq-item");' +
    '  var isOpen=item.classList.contains("open");' +
    '  document.querySelectorAll(".faq-item.open").forEach(function(i){i.classList.remove("open");});' +
    '  if(!isOpen)item.classList.add("open");' +
    '}';

  var canvasW = _canvasMode === 'mobile' ? 390 : 1100;

  var extraCss = '[data-selected]{outline:3px solid #00AAFF !important;outline-offset:-2px;position:relative;z-index:1;}' +
    '[data-bid]{cursor:pointer;}' +
    '[data-bid]:hover:not([data-selected]){outline:2px solid rgba(0,170,255,.3);outline-offset:-2px;}' +
    '@media print{' +
    '  [data-bid]{outline:none!important;}' +
    '  nav{position:relative!important;box-shadow:none!important;}' +
    '  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
    '  section,footer{break-inside:avoid;}' +
    '  .case-featured,.pricing-grid,.reviews-grid,.contacts-grid,.stats-row{break-inside:avoid;}' +
    '  .hero-grid{grid-template-columns:1fr!important;}' +
    '  .hero-photo-wrap{display:none!important;}' +
    '  @page{margin:1.2cm;size:A4;}' +
    '}';

  return '<!DOCTYPE html>\n<html lang="ru" data-theme="light">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=' + canvasW + ',initial-scale=1">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="/sales-doc/canvas.css?v=20260526-9">\n' +
    '<style>' + extraCss + '\n@media print{[data-bid]{outline:none!important;}}</style>\n' +
    '<script>' + iframeScript + '<\/script>\n' +
    '</head>\n<body>\n' + blocksHtml + '\n</body>\n</html>';
}

/* ── CANVAS MODE ── */
var _canvasMode = 'desktop';
var _pendingCanvasScrollId = null;
function switchCanvasMode(mode) {
  recordHistory();
  _canvasMode = mode;
  updateCanvasModeButtons();
  scheduleDraftSave();
  updatePreview();
}

function scrollCanvasToBlock(id) {
  var frame = document.getElementById('preview-frame');
  var outer = document.getElementById('canvas-outer');
  var scroll = document.getElementById('canvas-scroll');
  if (!frame || !outer || !scroll || !id) return false;
  var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
  var target = doc && doc.querySelector('[data-bid="' + id + '"]');
  if (!target) return false;
  var scale = frame._scale || 1;
  scroll.scrollTo({ top: outer.offsetTop + target.offsetTop * scale - 18, behavior: 'smooth' });
  return true;
}

function getCanvasAvailWidth(scroll) {
  var cs = window.getComputedStyle(scroll);
  var pad = parseFloat(cs.paddingLeft || '0') + parseFloat(cs.paddingRight || '0');
  return Math.max(280, scroll.clientWidth - pad - 16);
}

/* ── PREVIEW UPDATE ── */
var previewTimer = null;
function updatePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(function() {
    var html   = buildFullHtml();
    var frame  = document.getElementById('preview-frame');
    var wrap   = document.getElementById('canvas-frame-wrap');
    var outer  = document.getElementById('canvas-outer');
    var scroll = document.getElementById('canvas-scroll');
    var hasBlocks = state.blocks.length > 0;
    document.getElementById('canvas-empty').style.display = hasBlocks ? 'none' : 'block';
    outer.style.display = hasBlocks ? 'block' : 'none';
    if (!hasBlocks) return;

    // Canvas width: 1100px desktop / 390px mobile
    var canvasW = _canvasMode === 'mobile' ? 390 : 1100;
    var availW  = getCanvasAvailWidth(scroll);
    if (availW <= 0) availW = 600;
    var scale   = Math.min(1, Math.max(0.25, availW / canvasW));
    var scaledW = Math.floor(canvasW * scale);

    // iframe = full canvasW, transform wraps it down to scaledW
    wrap.style.width = canvasW + 'px';
    frame.style.width = canvasW + 'px';
    frame.style.height = (frame._lastH || 900) + 'px';
    wrap.style.transform = 'scale(' + scale + ')';
    wrap.style.transformOrigin = 'top left';
    outer.style.width = scaledW + 'px';
    outer.style.height = (frame._lastH ? Math.round(frame._lastH * scale + 40) : 600) + 'px';
    frame._scale   = scale;
    frame._canvasW = canvasW;
    frame.srcdoc   = html;
  }, 120);
}

/* ── DRAG & DROP ── */
var _dragType = null;
function onCatalogDragStart(e, type) {
  _dragType = type;
  e.dataTransfer.effectAllowed = 'copy';
  document.getElementById('drop-overlay').classList.add('active');
}
function onCatalogDragEnd() {
  _dragType = null;
  document.getElementById('drop-overlay').classList.remove('active');
  document.getElementById('canvas-empty').classList.remove('drag-target');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-overlay').classList.remove('active');
  document.getElementById('canvas-empty').classList.remove('drag-target');
  if (_dragType) { addBlock(_dragType); _dragType = null; }
}
function onEmptyDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('canvas-empty').classList.add('drag-target');
}
function onEmptyDragLeave(e) {
  document.getElementById('canvas-empty').classList.remove('drag-target');
}

/* ── BLOCK MANAGEMENT ── */
function defByType(type) {
  return BLOCK_DEFS.find(function(d) { return d.type === type; });
}
function addBlock(type) {
  var def = defByType(type);
  if (!def) return;
  if (def.singleton && state.blocks.find(function(b) { return b.type === type; })) {
    showToast(def.label + ' — уже добавлен');
    return;
  }
  recordHistory();
  var block = { id: state._nextId++, type: type, data: def.defaultData() };
  state.blocks.push(block);
  state.selectedId = block.id;
  _pendingCanvasScrollId = block.id;
  renderAll();
  scheduleDraftSave();
  updatePreview();
  showToast('Блок добавлен: ' + def.label);
}
function removeBlock(id) {
  var idx = state.blocks.findIndex(function(b) { return b.id === id; });
  if (idx < 0) return;
  recordHistory();
  state.blocks.splice(idx, 1);
  if (state.selectedId === id) {
    state.selectedId = state.blocks.length ? state.blocks[Math.max(0, idx-1)].id : null;
  }
  renderAll();
  scheduleDraftSave();
  updatePreview();
}
function moveBlock(id, dir) {
  var idx = state.blocks.findIndex(function(b) { return b.id === id; });
  if (idx < 0) return;
  var ni = idx + dir;
  if (ni < 0 || ni >= state.blocks.length) return;
  recordHistory();
  var tmp = state.blocks[idx];
  state.blocks[idx] = state.blocks[ni];
  state.blocks[ni] = tmp;
  renderOrderList();
  scheduleDraftSave();
  updatePreview();
}
function duplicateBlock(id) {
  var idx = state.blocks.findIndex(function(b) { return b.id === id; });
  if (idx < 0) return;
  var source = state.blocks[idx];
  var def = defByType(source.type);
  if (def && def.singleton) {
    showToast('Этот блок может быть только один');
    return;
  }
  recordHistory();
  var copy = { id: state._nextId++, type: source.type, data: cloneData(source.data) };
  state.blocks.splice(idx + 1, 0, copy);
  state.selectedId = copy.id;
  _pendingCanvasScrollId = copy.id;
  renderAll();
  scheduleDraftSave();
  updatePreview();
  showToast('Блок продублирован');
}
function selectBlock(id) {
  state.selectedId = id;
  renderOrderList();
  renderPropsPanel(id);
  // Scroll to block in order list
  var active = document.querySelector('.order-item.active');
  if (active) active.scrollIntoView({ block: 'nearest' });
  _pendingCanvasScrollId = id;
  updatePreview();
}

/* ── RENDER UI ── */
function renderAll() {
  renderCatalog();
  renderOrderList();
  renderPropsPanel(state.selectedId);
}

function renderCatalog() {
  var addedTypes = state.blocks.map(function(b) { return b.type; });
  document.getElementById('blocks-catalog').innerHTML = BLOCK_DEFS.map(function(def) {
    var isAdded = def.singleton && addedTypes.indexOf(def.type) >= 0;
    var typeArg = "'" + def.type + "'";
    return '<div class="catalog-item' + (isAdded ? ' added' : '') + '"' +
      ' draggable="true"' +
      ' ondragstart="onCatalogDragStart(event,' + typeArg + ')"' +
      ' ondragend="onCatalogDragEnd()"' +
      ' onclick="' + (isAdded ? '' : 'addBlock(' + typeArg + ')') + '">' +
      '<span class="catalog-icon">' + blockIcon(def.type) + '</span>' +
      '<span class="catalog-label">' + def.label + '</span>' +
      '<span class="catalog-add">' + (isAdded ? '✓' : '+') + '</span>' +
      '</div>';
  }).join('');
}

function renderOrderList() {
  var list = document.getElementById('order-list');
  if (!state.blocks.length) {
    list.innerHTML = '<div class="order-empty">Список пустой</div>';
    return;
  }
  list.innerHTML = state.blocks.map(function(b, idx) {
    var def = defByType(b.type);
    var isActive = b.id === state.selectedId;
    return '<div class="order-item' + (isActive ? ' active' : '') + '" onclick="selectBlock(' + b.id + ')">' +
      '<span class="order-icon">' + blockIcon(b.type) + '</span>' +
      '<span class="order-label">' + (def ? def.label : b.type) + '</span>' +
      '<div class="order-actions">' +
      (idx > 0 ? '<button class="order-btn" title="Переместить выше" onclick="event.stopPropagation();moveBlock(' + b.id + ',-1)">↑</button>' : '') +
      (idx < state.blocks.length - 1 ? '<button class="order-btn" title="Переместить ниже" onclick="event.stopPropagation();moveBlock(' + b.id + ',1)">↓</button>' : '') +
      (!def || !def.singleton ? '<button class="order-btn" title="Дублировать секцию" onclick="event.stopPropagation();duplicateBlock(' + b.id + ')">⧉</button>' : '') +
      '<button class="order-btn order-del" title="Удалить секцию" onclick="event.stopPropagation();removeBlock(' + b.id + ')">×</button>' +
      '</div></div>';
  }).join('');
}

function renderPropsPanel(id) {
  var titleEl = document.getElementById('props-title');
  var bodyEl = document.getElementById('props-body');
  if (!id) {
    titleEl.textContent = 'Свойства';
    bodyEl.innerHTML = '<p class="props-hint">Выберите блок в структуре для редактирования</p>';
    return;
  }
  var block = state.blocks.find(function(b) { return b.id === id; });
  if (!block) return;
  var def = defByType(block.type);
  if (!def) return;
  titleEl.innerHTML = '<span class="props-title-icon">' + blockIcon(block.type) + '</span>' + esc(def.label);
  bodyEl.innerHTML = aiToolbar(block) + def.renderProps(block.data, id);
  bindPropsEvents(id, block);
}

/* ── PROPS DATA BINDING ── */
function bindPropsEvents(id, block) {
  var body = document.getElementById('props-body');

  body.querySelectorAll('[data-ai-action]').forEach(function(button) {
    button.addEventListener('click', function() {
      runBlockAi(block, button.dataset.aiAction || 'block_rewrite');
    });
  });

  body.querySelectorAll('[data-path]').forEach(function(el) {
    el.addEventListener('focus', function() {
      if (!el._historyStarted) {
        recordHistory();
        el._historyStarted = true;
      }
    });
    el.addEventListener('blur', function() { el._historyStarted = false; });
    el.addEventListener('input', function() {
      if (el.dataset.mask === 'phone') el.value = formatPhoneDisplay(el.value);
      setByPath(block.data, el.dataset.path, el.type === 'checkbox' ? el.checked : el.value);
      scheduleDraftSave();
      updatePreview();
    });
    if (el.type === 'checkbox') {
      el.addEventListener('change', function() {
        setByPath(block.data, el.dataset.path, el.checked);
        scheduleDraftSave();
        updatePreview();
      });
    }
  });

  body.querySelectorAll('[data-add-to]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      recordHistory();
      var key = btn.dataset.addTo;
      var tpl = btn.dataset.tpl;
      var val;
      try { val = JSON.parse(tpl); } catch(e) { val = ''; }
      if (!Array.isArray(block.data[key])) block.data[key] = [];
      block.data[key].push(val);
      renderPropsPanel(id);
      scheduleDraftSave();
      updatePreview();
    });
  });

  body.querySelectorAll('[data-add-path]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      recordHistory();
      var path = btn.dataset.addPath;
      var tpl = btn.dataset.tpl;
      var val;
      try { val = JSON.parse(tpl); } catch(e) { val = 'Новый пункт'; }
      var list = getByPath(block.data, path);
      if (!Array.isArray(list)) {
        setByPath(block.data, path, []);
        list = getByPath(block.data, path);
      }
      list.push(val);
      renderPropsPanel(id);
      scheduleDraftSave();
      updatePreview();
    });
  });

  body.querySelectorAll('[data-del-from]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var key = btn.dataset.delFrom;
      var idx = parseInt(btn.dataset.delIdx);
      if (Array.isArray(block.data[key])) {
        recordHistory();
        block.data[key].splice(idx, 1);
        renderPropsPanel(id);
        scheduleDraftSave();
        updatePreview();
      }
    });
  });

  body.querySelectorAll('[data-del-path]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var list = getByPath(block.data, btn.dataset.delPath);
      var idx = parseInt(btn.dataset.delIdx);
      if (Array.isArray(list)) {
        recordHistory();
        list.splice(idx, 1);
        renderPropsPanel(id);
        scheduleDraftSave();
        updatePreview();
      }
    });
  });

  body.querySelectorAll('[data-upload-to]').forEach(function(input) {
    input.addEventListener('change', function() {
      var file = input.files[0];
      if (!file) return;
      showToast('Загружаю изображение...');
      uploadImageFile(file, parseInt(input.dataset.maxPx || '600'), input.dataset.uploadTo)
        .then(function(data) {
          recordHistory();
          setByPath(block.data, input.dataset.uploadTo, data.url);
          renderPropsPanel(id);
          scheduleDraftSave();
          updatePreview();
          showToast('Изображение загружено');
        })
        .catch(function(err) { showToast(err.message || 'Ошибка загрузки'); });
    });
  });

  body.querySelectorAll('[data-clear-path]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      recordHistory();
      setByPath(block.data, btn.dataset.clearPath, '');
      renderPropsPanel(id);
      scheduleDraftSave();
      updatePreview();
    });
  });
}

/* ── TOAST ── */
function showToast(msg) {
  var t = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(function() { t.classList.add('hidden'); }, 2600);
}

/* ── PDF ── */
document.getElementById('ed-btn-pdf').addEventListener('click', function() {
  var frame = document.getElementById('preview-frame');
  if (frame && frame.contentWindow) frame.contentWindow.print();
  else showToast('Сначала добавьте блоки');
});

document.getElementById('ed-btn-reset').addEventListener('click', clearProject);
document.getElementById('ed-btn-draft').addEventListener('click', manualSaveDraft);
document.getElementById('ed-btn-load').addEventListener('click', loadPublishedProfile);
document.getElementById('ed-btn-undo').addEventListener('click', undoChange);
document.getElementById('ed-btn-redo').addEventListener('click', redoChange);

async function publishProfile() {
  if (!state.blocks.length) {
    showToast('Сначала создайте страницу');
    return;
  }
  var btn = document.getElementById('ed-btn-share');
  var linkIssues = validateProfileLinks();
  if (linkIssues.length && !confirm('Нашёл возможные проблемы со ссылками:\n\n' + linkIssues.join('\n') + '\n\nОпубликовать всё равно?')) {
    showToast('Публикация отменена');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Сохраняю...';
  var payload = JSON.stringify({
    v: 3,
    meta: getDocMeta(),
    blocks: state.blocks,
    body_html: buildBlocksHtml(false)
  });
  fetch('/sales-doc/save.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  }).then(function(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error(d.error || 'Ошибка сохранения');
      return d;
    });
  })
    .then(function(d) {
      if (d.url) {
        var url = location.origin + d.url;
        state.publicUrl = url;
        state.publishedAt = new Date().toISOString();
        state.dirtySincePublish = false;
        saveDraftNow();
        copyText(url).then(function() { showToast('Ссылка скопирована'); });
        showShareModal(url);
      } else {
        showToast('Ссылка создана, но сервер не вернул URL');
      }
    }).catch(function(e) { showToast(e.message || 'Ошибка сохранения'); })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = 'Ссылка';
    });
}

/* ── SHARE ── */
document.getElementById('ed-btn-share').addEventListener('click', function() {
  if (!state.blocks.length) {
    showToast('Сначала создайте страницу');
    return;
  }
  runProfileAudit({
    button: document.getElementById('ed-btn-share'),
    onPublish: publishProfile
  });
});

document.getElementById('ed-btn-audit').addEventListener('click', function() {
  if (!state.blocks.length) {
    showToast('Сначала создайте страницу');
    return;
  }
  runProfileAudit({ button: document.getElementById('ed-btn-audit') });
});

/* ── POSTMESSAGE FROM IFRAME ── */
window.addEventListener('message', function(e) {
  if (!e.data || typeof e.data !== 'object') return;
  if (e.data.t === 'resize') {
    var frame = document.getElementById('preview-frame');
    if (frame) {
      frame._lastH = e.data.h;
      var scale = frame._scale || 1;
      var wrap  = document.getElementById('canvas-frame-wrap');
      var outer = document.getElementById('canvas-outer');
      frame.style.height = e.data.h + 'px';
      // wrap height = real content height (iframe is this tall in layout)
      if (wrap)  wrap.style.height = e.data.h + 'px';
      // outer height = visual height after scale + padding
      if (outer) outer.style.height = Math.round(e.data.h * scale + 40) + 'px';
      if (_pendingCanvasScrollId) {
        var pendingId = _pendingCanvasScrollId;
        _pendingCanvasScrollId = null;
        setTimeout(function() { scrollCanvasToBlock(pendingId); }, 40);
      }
    }
  }
  if (e.data.t === 'select') {
    selectBlock(e.data.id);
  }
});

/* ── CANVAS RESIZE ON WINDOW RESIZE ── */
var _resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function() {
    var frame  = document.getElementById('preview-frame');
    var wrap   = document.getElementById('canvas-frame-wrap');
    var outer  = document.getElementById('canvas-outer');
    var scroll = document.getElementById('canvas-scroll');
    if (!frame || !wrap || !outer || !scroll || !state.blocks.length) return;
    var canvasW = _canvasMode === 'mobile' ? 390 : 1100;
    var availW  = getCanvasAvailWidth(scroll);
    var scale   = Math.min(1, Math.max(0.25, availW / canvasW));
    frame.style.width = canvasW + 'px';
    wrap.style.transform = 'scale(' + scale + ')';
    frame._scale = scale;
    outer.style.width = Math.floor(canvasW * scale) + 'px';
    if (frame._lastH) {
      wrap.style.height  = frame._lastH + 'px';
      outer.style.height = Math.round(frame._lastH * scale + 40) + 'px';
    }
  }, 150);
});

window.addEventListener('beforeunload', function() {
  saveDraftNow();
});

/* ── MOBILE ── */
document.getElementById('ed-mobile-btn').addEventListener('click', function() {
  document.getElementById('ed-aside-r').classList.toggle('open');
});

/* ── WIZARD ── */
var _wzPhoto = '';

function initWizard(force) {
  if (force === true) document.getElementById('wz-overlay').classList.remove('hidden');
  if (state.blocks.length > 0) return;
  document.getElementById('wz-overlay').classList.remove('hidden');

  document.getElementById('wz-photo-inp').addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    showToast('Загружаю фото...');
    uploadImageFile(file, 600, 'profile')
      .then(function(data) {
        _wzPhoto = data.url;
        var imgEl = document.getElementById('wz-avatar-img');
        imgEl.src = _wzPhoto;
        imgEl.style.display = 'block';
        document.getElementById('wz-avatar-ph').style.display = 'none';
        showToast('Фото загружено');
      })
      .catch(function(err) { showToast(err.message || 'Ошибка загрузки фото'); });
  });

  // Submit on Enter key
  document.getElementById('wz-overlay').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitWizard(false);
  });
}

function closeWizard() {
  document.getElementById('wz-overlay').classList.add('hidden');
}

function wzOverlayClick(e) {
  if (e.target === document.getElementById('wz-overlay')) closeWizard();
}

async function submitWizard(useAi) {
  var name      = (document.getElementById('wz-name').value.trim()      || 'Иван Проценко');
  var specialty = (document.getElementById('wz-specialty').value.trim() || 'Авитолог · Продвижение на Авито');
  var phone     = document.getElementById('wz-phone').value.trim().replace(/\D/g, '');
  var tg        = document.getElementById('wz-tg').value.trim().replace(/^@/, '') || 'avitolog';
  var avitoUrl  = document.getElementById('wz-avito-url').value.trim();
  var avitoData = null;
  var submitBtn = useAi ? document.getElementById('wz-ai-submit') : document.getElementById('wz-submit');
  var defaultText = useAi ? 'Создать с AI' : 'Создать профиль';

  if (avitoUrl) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Читаю Avito...';
    avitoData = await importAvitoUrl(avitoUrl);
    submitBtn.disabled = false;
    submitBtn.textContent = defaultText;
  }

  // Собрать все блоки сразу
  var ORDER = avitoData
    ? ['nav','hero','avito','media-text','stats','services','case','process','contacts','cta','footer']
    : ['nav','hero','media-text','stats','services','case','process','contacts','cta','footer'];
  state.blocks = [];
  state._nextId = 1;
  ORDER.forEach(function(type) {
    var def = defByType(type);
    if (def) state.blocks.push({ id: state._nextId++, type: type, data: def.defaultData() });
  });

  // Вставить данные пользователя
  state.blocks.forEach(function(b) {
    switch (b.type) {
      case 'nav':
        b.data.name = name;
        b.data.showAvito = !!avitoData;
        break;
      case 'hero':
        if (_wzPhoto) b.data.photoUrl = _wzPhoto;
        b.data.photoAlt = 'Фото авитолога ' + name + ' — ' + specialty;
        break;
      case 'about':
        b.data.name    = name;
        b.data.tagline = specialty;
        if (_wzPhoto) b.data.photoUrl = _wzPhoto;
        b.data.photoAlt = 'Фото специалиста ' + name + ' — ' + specialty;
        break;
      case 'avito':
        if (avitoData) {
          b.data.url = avitoData.url || avitoUrl;
          b.data.title = avitoData.title || avitoTitleFromUrl(avitoUrl);
          b.data.description = avitoData.description || b.data.description;
          b.data.imageUrl = avitoData.imageUrl || '';
          b.data.imageAlt = 'Скриншот публичной страницы Avito: ' + b.data.title;
          b.data.location = avitoData.location || '';
          b.data.blocked = !!avitoData.blocked;
          b.data.note = avitoData.blocked
            ? 'Ссылка сохранена. Если Avito не отдал данные автоматически, заголовок и описание можно поправить вручную.'
            : 'Данные подтянуты из публичной страницы Avito';
        }
        break;
      case 'contacts':
        if (avitoUrl) b.data.primaryUrl = avitoUrl;
        b.data.primaryNewTab = true;
        if (phone) { b.data.phone = phone; b.data.maxPhone = phone; b.data.waPhone = phone; }
        if (tg) b.data.tgHandle = tg;
        break;
      case 'footer':
        b.data.name = name;
        if (tg) b.data.tgHandle = tg;
        break;
    }
  });

  if (useAi) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'AI собирает профиль...';
    try {
      var aiResult = await generateProfileAi({
        name: name,
        specialty: specialty,
        phone: phone,
        telegram: tg,
        avitoUrl: avitoUrl,
        avitoImported: avitoData
      });
      showToast(aiResult.note || 'AI собрал профиль');
    } catch (error) {
      showToast(error.message || 'AI не смог собрать профиль, создан базовый вариант');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = defaultText;
    }
  }

  state.selectedId = state.blocks[0].id;
  closeWizard();
  renderAll();
  scheduleDraftSave();
  updatePreview();
  showToast('Профиль создан — осталось усилить доказательства!');
}

/* ── INIT ── */
window.addEventListener('DOMContentLoaded', function() {
  _storageReady = true;
  var restored = restoreDraft();
  document.getElementById('btn-mode-desktop').classList.toggle('active', _canvasMode === 'desktop');
  document.getElementById('btn-mode-mobile').classList.toggle('active', _canvasMode === 'mobile');
  renderAll();
  updatePreview();
  if (!restored) initWizard();
});
