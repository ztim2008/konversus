/**
 * Konversus AI Architect Widget v2
 * Embeddable: <div id="architect-widget"></div>
 * <script src="https://konversus.ru/architect-widget.js" data-theme="dark"></script>
 *
 * Attrs:
 *   data-theme="dark|light"  — default "dark"
 *   data-container="id"      — default "architect-widget"
 */
(function () {
  "use strict";

  var API_BASE = "https://konversus.ru";

  // ── URL detection (зеркало url-detector.ts) ───────────────────────────
  function detectType(url) {
    if (/^https?:\/\/(www\.)?ozon\.ru\//i.test(url)) return { type: "ozon", label: "Ozon" };
    if (/^https?:\/\/(www\.)?(wildberries\.ru|wb\.ru)\//i.test(url)) return { type: "wb", label: "Wildberries" };
    if (/^https?:\/\/(www\.)?avito\.ru\/(companies|brands|user|shop)\//i.test(url)) return { type: "avito-seller", label: "Авито — продавец" };
    if (/^https?:\/\/(www\.)?avito\.ru\//i.test(url)) return { type: "avito-listing", label: "Авито — объявление" };
    return { type: "website", label: "Сайт" };
  }

  function isValidUrl(url) {
    try {
      var p = new URL(url);
      return p.protocol === "http:" || p.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────
  function getStyles(theme, widthMode) {
    var dark = theme !== "light";
    var isFull = widthMode === "full";
    return [
      ".kw-wrap{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-sizing:border-box;padding:28px 24px 20px;border-radius:4px;" + (isFull ? "max-width:100%;width:100%;" : "max-width:560px;width:100%;margin:0 auto;") + "position:relative;" + (dark ? "background:#0d1216;border:1px solid rgba(255,255,255,0.1);color:#edf1f4;" : "background:#fff;border:1px solid #e5e7eb;color:#111827;") + "}",
      ".kw-wrap *{box-sizing:border-box;}",
      ".kw-title{font-size:22px;font-weight:800;margin:0 0 6px;padding-right:36px;letter-spacing:-0.02em;line-height:1.2;" + (dark ? "color:#edf1f4;" : "color:#111827;") + "}",
      ".kw-typing{font-size:12px;margin:0 0 16px;min-height:18px;" + (dark ? "color:#8d99a6;" : "color:#6b7280;") + "}",
      ".kw-cursor{display:inline-block;width:2px;height:12px;margin-left:2px;vertical-align:middle;animation:kw-blink .7s step-end infinite;" + (dark ? "background:#f6c47b;" : "background:#4f46e5;") + "}",
      "@keyframes kw-blink{0%,100%{opacity:1}50%{opacity:0}}",
      ".kw-row{display:flex;gap:8px;align-items:stretch;margin-bottom:8px;}",
      ".kw-input{flex:1;padding:10px 14px;font-size:13px;border-radius:3px;outline:none;transition:border-color .2s;" + (dark ? "background:#090d10;border:1px solid rgba(255,255,255,0.12);color:#edf1f4;" : "background:#f9fafb;border:1px solid #d1d5db;color:#111827;") + "}",
      ".kw-input:focus{" + (dark ? "border-color:rgba(246,196,123,0.4);" : "border-color:#6366f1;") + "}",
      ".kw-input::placeholder{" + (dark ? "color:#8d99a6;" : "color:#9ca3af;") + "}",
      ".kw-btn{padding:10px 18px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;border-radius:3px;white-space:nowrap;transition:opacity .2s;display:flex;align-items:center;gap:6px;" + (dark ? "background:#f6c47b;color:#0d1216;" : "background:#4f46e5;color:#fff;") + "}",
      ".kw-btn:disabled{opacity:.5;cursor:not-allowed;}",
      ".kw-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:2px;margin-bottom:8px;" + (dark ? "background:rgba(246,196,123,0.12);color:#f6c47b;" : "background:#ede9fe;color:#5b21b6;") + "}",
      ".kw-error{font-size:12px;padding:8px 12px;border-radius:3px;margin-bottom:8px;background:rgba(239,68,68,.12);color:#ef4444;}",
      ".kw-hint{font-size:10px;text-align:center;margin-top:12px;" + (dark ? "color:#8d99a6;" : "color:#9ca3af;") + "}",
      ".kw-footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:8px;}",
      ".kw-powered{font-size:10px;" + (dark ? "color:#8d99a6;" : "color:#9ca3af;") + "}",
      ".kw-powered a{" + (dark ? "color:#f6c47b;" : "color:#4f46e5;") + "text-decoration:none;}",
      ".kw-install-btn{font-size:10px;font-weight:500;cursor:pointer;border:none;background:none;padding:2px 6px;border-radius:2px;transition:all .15s;display:flex;align-items:center;gap:4px;" + (dark ? "color:#8d99a6;border:1px solid rgba(255,255,255,0.08);" : "color:#6b7280;border:1px solid #e5e7eb;") + "}",
      ".kw-install-btn:hover{" + (dark ? "color:#f6c47b;border-color:rgba(246,196,123,0.3);" : "color:#4f46e5;border-color:#c7d2fe;") + "}",
      ".kw-theme-btn{position:absolute;top:12px;right:12px;width:28px;height:28px;border:none;cursor:pointer;border-radius:3px;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;" + (dark ? "background:rgba(255,255,255,0.06);color:#8d99a6;" : "background:#f3f4f6;color:#6b7280;") + "}",
      ".kw-theme-btn:hover{" + (dark ? "background:rgba(255,255,255,0.1);" : "background:#e5e7eb;") + "}",
      ".kw-spinner{width:12px;height:12px;border:2px solid rgba(0,0,0,.2);border-top-color:#0d1216;border-radius:50%;animation:kw-spin .7s linear infinite;display:inline-block;}",
      "@keyframes kw-spin{to{transform:rotate(360deg);}}",
      /* Modal */
      ".kw-modal-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);animation:kw-fade-in .15s ease;}",
      ".kw-modal{border-radius:8px;padding:28px;width:100%;max-width:540px;position:relative;animation:kw-slide-up .2s ease;" + (dark ? "background:#0d1216;border:1px solid rgba(255,255,255,0.12);color:#edf1f4;" : "background:#fff;border:1px solid #e5e7eb;color:#111827;") + "}",
      ".kw-modal-title{font-size:16px;font-weight:700;margin:0 0 6px;}",
      ".kw-modal-sub{font-size:12px;margin:0 0 20px;" + (dark ? "color:#8d99a6;" : "color:#6b7280;") + "}",
      ".kw-modal-close{position:absolute;top:12px;right:12px;width:30px;height:30px;border:none;cursor:pointer;border-radius:3px;font-size:16px;display:flex;align-items:center;justify-content:center;" + (dark ? "background:rgba(255,255,255,0.06);color:#8d99a6;" : "background:#f3f4f6;color:#6b7280;") + "}",
      ".kw-modal-theme-row{display:flex;gap:6px;margin-bottom:16px;}",
      ".kw-theme-choice{padding:6px 14px;font-size:12px;font-weight:500;border-radius:3px;cursor:pointer;border:none;transition:all .15s;}",
      ".kw-theme-choice.active{" + (dark ? "background:#f6c47b;color:#0d1216;" : "background:#4f46e5;color:#fff;") + "}",
      ".kw-theme-choice:not(.active){" + (dark ? "background:rgba(255,255,255,0.06);color:#8d99a6;" : "background:#f3f4f6;color:#6b7280;") + "}",
      ".kw-modal-code-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;" + (dark ? "color:#8d99a6;" : "color:#9ca3af;") + "}",
      ".kw-modal-code{display:block;width:100%;padding:14px;font-size:12px;font-family:ui-monospace,'SF Mono',Consolas,monospace;border-radius:4px;resize:none;outline:none;line-height:1.5;" + (dark ? "background:#050709;border:1px solid rgba(255,255,255,0.1);color:#a5f3b4;" : "background:#f8fafc;border:1px solid #e2e8f0;color:#166534;") + "}",
      ".kw-copy-btn{margin-top:12px;padding:9px 20px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border:none;cursor:pointer;border-radius:3px;width:100%;transition:all .15s;" + (dark ? "background:#f6c47b;color:#0d1216;" : "background:#4f46e5;color:#fff;") + "}",
      ".kw-copy-btn.copied{" + (dark ? "background:#22c55e;color:#fff;" : "background:#22c55e;color:#fff;") + "}",
      "@keyframes kw-fade-in{from{opacity:0}to{opacity:1}}",
      "@keyframes kw-slide-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}"
    ].join("");
  }

  // ── Embed code generator ──────────────────────────────────────────────
  function getEmbedCode(modalTheme, modalWidth) {
    var widthAttr = modalWidth === "full" ? '\n  data-width="full"' : '';
    return '<div id="architect-widget"></div>\n<script\n  src="' + API_BASE + '/architect-widget.js"\n  data-theme="' + modalTheme + '"' + widthAttr + '\n><\/script>';
  }

  // ── Modal ─────────────────────────────────────────────────────────────
  function showInstallModal(widgetTheme, widgetWidth) {
    var modalTheme = widgetTheme;
    var modalWidth = widgetWidth || "narrow";

    var overlay = document.createElement("div");
    overlay.className = "kw-modal-overlay";

    var modal = document.createElement("div");
    modal.className = "kw-modal";

    // Close button
    var closeBtn = document.createElement("button");
    closeBtn.className = "kw-modal-close";
    closeBtn.innerHTML = "×";
    closeBtn.setAttribute("aria-label", "Закрыть");
    modal.appendChild(closeBtn);

    // Title
    var title = document.createElement("div");
    title.className = "kw-modal-title";
    title.textContent = "Установите виджет на свой сайт";
    modal.appendChild(title);

    var sub = document.createElement("div");
    sub.className = "kw-modal-sub";
    sub.textContent = "Вставьте код перед закрывающим тегом </body>";
    modal.appendChild(sub);

    // Settings row (тема + ширина рядом)
    var settingsGrid = document.createElement("div");
    settingsGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;";

    // Theme column
    var themeCol = document.createElement("div");
    var themeLabel = document.createElement("div");
    themeLabel.className = "kw-modal-code-label";
    themeLabel.textContent = "Тема";
    themeCol.appendChild(themeLabel);
    var themeRow = document.createElement("div");
    themeRow.className = "kw-modal-theme-row";
    themeRow.style.marginBottom = "0";
    ["dark", "light"].forEach(function (t) {
      var btn = document.createElement("button");
      btn.className = "kw-theme-choice" + (t === modalTheme ? " active" : "");
      btn.textContent = t === "dark" ? "🌙 Тёмная" : "☀️ Светлая";
      btn.addEventListener("click", function () {
        modalTheme = t;
        themeRow.querySelectorAll(".kw-theme-choice").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        codeArea.value = getEmbedCode(modalTheme, modalWidth);
      });
      themeRow.appendChild(btn);
    });
    themeCol.appendChild(themeRow);
    settingsGrid.appendChild(themeCol);

    // Width column
    var widthCol = document.createElement("div");
    var widthLabel = document.createElement("div");
    widthLabel.className = "kw-modal-code-label";
    widthLabel.textContent = "Ширина";
    widthCol.appendChild(widthLabel);
    var widthRow = document.createElement("div");
    widthRow.className = "kw-modal-theme-row";
    widthRow.style.marginBottom = "0";
    [{val: "narrow", label: "↔ 560px"}, {val: "full", label: "⟺ 100%"}].forEach(function (w) {
      var btn = document.createElement("button");
      btn.className = "kw-theme-choice" + (w.val === modalWidth ? " active" : "");
      btn.textContent = w.label;
      btn.addEventListener("click", function () {
        modalWidth = w.val;
        widthRow.querySelectorAll(".kw-theme-choice").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        codeArea.value = getEmbedCode(modalTheme, modalWidth);
      });
      widthRow.appendChild(btn);
    });
    widthCol.appendChild(widthRow);
    settingsGrid.appendChild(widthCol);

    modal.appendChild(settingsGrid);

    // Code area
    var codeLabel = document.createElement("div");
    codeLabel.className = "kw-modal-code-label";
    codeLabel.style.marginTop = "4px";
    codeLabel.textContent = "Код для вставки";
    modal.appendChild(codeLabel);

    var codeArea = document.createElement("textarea");
    codeArea.className = "kw-modal-code";
    codeArea.rows = 6;
    codeArea.readOnly = true;
    codeArea.value = getEmbedCode(modalTheme, modalWidth);
    modal.appendChild(codeArea);

    // Copy button
    var copyBtn = document.createElement("button");
    copyBtn.className = "kw-copy-btn";
    copyBtn.textContent = "Скопировать код";
    copyBtn.addEventListener("click", function () {
      var code = codeArea.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () {
          copyBtn.textContent = "✓ Скопировано!";
          copyBtn.classList.add("copied");
          setTimeout(function () {
            copyBtn.textContent = "Скопировать код";
            copyBtn.classList.remove("copied");
          }, 2000);
        });
      } else {
        codeArea.select();
        document.execCommand("copy");
        copyBtn.textContent = "✓ Скопировано!";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = "Скопировать код";
          copyBtn.classList.remove("copied");
        }, 2000);
      }
    });
    modal.appendChild(copyBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeModal() {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity .15s";
      setTimeout(function () { overlay.remove(); }, 150);
    }

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", onEsc); }
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    var scripts = document.querySelectorAll("script[src*='architect-widget']");
    var scriptTag = scripts[scripts.length - 1];
    var theme = (scriptTag && scriptTag.getAttribute("data-theme")) || "dark";
    var containerId = (scriptTag && scriptTag.getAttribute("data-container")) || "architect-widget";

    var container = document.getElementById(containerId);
    if (!container) return;

    // Inject styles
    var styleEl = document.createElement("style");
    styleEl.textContent = getStyles(theme);
    document.head.appendChild(styleEl);

    // Build markup
    var wrap = document.createElement("div");
    wrap.className = "kw-wrap";

    // Theme toggle button
    var themeBtn = document.createElement("button");
    themeBtn.className = "kw-theme-btn";
    themeBtn.title = theme === "dark" ? "Светлая тема" : "Тёмная тема";
    themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    themeBtn.addEventListener("click", function () {
      theme = theme === "dark" ? "light" : "dark";
      themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
      themeBtn.title = theme === "dark" ? "Светлая тема" : "Тёмная тема";
      styleEl.textContent = getStyles(theme);
    });
    wrap.appendChild(themeBtn);

    var title = document.createElement("p");
    title.className = "kw-title";
    title.textContent = "Карта роста вашего бизнеса";
    wrap.appendChild(title);

    // Печатающий подзаголовок
    var sub = document.createElement("p");
    sub.className = "kw-typing";
    var cursor = document.createElement("span");
    cursor.className = "kw-cursor";
    sub.appendChild(cursor);
    wrap.appendChild(sub);

    var typingPhrases = [
      "Найдём где теряется доход",
      "Проверим SEO за 30 секунд",
      "AI-анализ вашего сайта",
      "Покажем план роста конверсии",
      "Бесплатно. Без регистрации",
    ];
    var typingIdx = 0, typingChar = 0, typingDeleting = false, typingTimeout;
    function typingTick() {
      var phrase = typingPhrases[typingIdx];
      if (!typingDeleting) {
        typingChar++;
        sub.textContent = phrase.slice(0, typingChar);
        sub.appendChild(cursor);
        if (typingChar === phrase.length) {
          typingDeleting = true;
          typingTimeout = setTimeout(typingTick, 1800);
        } else {
          typingTimeout = setTimeout(typingTick, 55);
        }
      } else {
        typingChar--;
        sub.textContent = phrase.slice(0, typingChar);
        sub.appendChild(cursor);
        if (typingChar === 0) {
          typingDeleting = false;
          typingIdx = (typingIdx + 1) % typingPhrases.length;
          typingTimeout = setTimeout(typingTick, 300);
        } else {
          typingTimeout = setTimeout(typingTick, 30);
        }
      }
    }
    typingTimeout = setTimeout(typingTick, 600);

    var badge = document.createElement("div");
    badge.className = "kw-badge";
    badge.style.display = "none";
    wrap.appendChild(badge);

    var errorEl = document.createElement("div");
    errorEl.className = "kw-error";
    errorEl.style.display = "none";
    wrap.appendChild(errorEl);

    var row = document.createElement("div");
    row.className = "kw-row";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "kw-input";
    input.placeholder = "https://...";
    input.autocomplete = "off";
    input.spellcheck = false;
    row.appendChild(input);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kw-btn";
    btn.textContent = "Анализировать";
    btn.disabled = true;
    row.appendChild(btn);

    wrap.appendChild(row);

    var hint = document.createElement("p");
    hint.className = "kw-hint";
    hint.textContent = "Анализ занимает 15–40 секунд. Результат откроется в новой вкладке.";
    wrap.appendChild(hint);

    // Footer: powered + install btn
    var footer = document.createElement("div");
    footer.className = "kw-footer";

    var powered = document.createElement("p");
    powered.className = "kw-powered";
    powered.innerHTML = 'Изготовлено в <a href="https://konversus.ru" target="_blank" rel="noopener">Konversus</a>';
    footer.appendChild(powered);

    var installBtn = document.createElement("a");
    installBtn.className = "kw-install-btn";
    installBtn.innerHTML = '&lt;/&gt; Установить на свой сайт';
    installBtn.href = API_BASE + "/install";
    installBtn.target = "_blank";
    installBtn.rel = "noopener";
    footer.appendChild(installBtn);

    wrap.appendChild(footer);
    container.appendChild(wrap);

    // ── Logic ─────────────────────────────────────────────────────────

    function normalizeUrl(val) {
      val = val.trim();
      return (val.startsWith("http://") || val.startsWith("https://")) ? val : "https://" + val;
    }

    input.addEventListener("input", function () {
      var val = input.value;
      errorEl.style.display = "none";
      btn.disabled = !val.trim();

      if (val.trim().length > 8) {
        var normalized = normalizeUrl(val);
        if (isValidUrl(normalized)) {
          var detected = detectType(normalized);
          badge.textContent = detected.label;
          badge.style.display = "inline-flex";
        } else {
          badge.style.display = "none";
        }
      } else {
        badge.style.display = "none";
      }
    });

    btn.addEventListener("click", function () {
      var val = normalizeUrl(input.value);
      if (!isValidUrl(val)) {
        errorEl.textContent = "Введите корректный URL";
        errorEl.style.display = "block";
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="kw-spinner"></span> Запускаем...';
      errorEl.style.display = "none";

      fetch(API_BASE + "/api/architect/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: val })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.id) {
            // cached=true — более ранний анализ, уведомляем пользователя
            if (data.cached) {
              btn.textContent = "Готово — открываем";
            }
            window.open(API_BASE + "/architect/" + data.id, "_blank");
            btn.disabled = false;
            btn.textContent = "Анализировать";
          } else {
            throw new Error(data.error || "Ошибка сервера");
          }
        })
        .catch(function (err) {
          errorEl.textContent = err.message || "Произошла ошибка. Попробуйте снова.";
          errorEl.style.display = "block";
          btn.disabled = false;
          btn.textContent = "Анализировать";
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
