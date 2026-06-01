<?php
/**
 * SalesDoc Builder — public block document
 * URL: /sales-doc/doc/{slug}
 */

require_once __DIR__ . '/storage.php';

$slug = '';
if (!empty($_GET['slug'])) {
        $slug = $_GET['slug'];
} elseif (!empty($_SERVER['PATH_INFO'])) {
        $slug = ltrim($_SERVER['PATH_INFO'], '/');
}

function not_found(): void {
        http_response_code(404);
        echo '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Документ не найден</title></head><body style="font-family:Manrope,Arial,sans-serif;text-align:center;padding:80px 20px;color:#64748b"><h1 style="color:#111827">404</h1><p>Документ не найден или удалён</p><a href="/sales-doc/">Создать новый</a></body></html>';
        exit;
}

if (!preg_match('/^[a-z2-9]{12}$/', $slug)) {
        not_found();
}

$data = salesdoc_load_document($slug);
if (!$data) {
    $file = __DIR__ . '/data/' . $slug . '.json';
    if (!file_exists($file)) {
        not_found();
    }
    $data = json_decode(file_get_contents($file), true);
}
if (!is_array($data) || (int)($data['v'] ?? 0) !== 3) {
        http_response_code(500);
        echo 'Invalid SalesDoc document';
        exit;
}

function esc($str): string {
        return htmlspecialchars((string)($str ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

$meta = is_array($data['meta'] ?? null) ? $data['meta'] : [];
$name = trim((string)($meta['name'] ?? 'SalesDoc')) ?: 'SalesDoc';
$title_text = trim((string)($meta['title'] ?? $name));
$description = trim((string)($meta['description'] ?? 'Короткая страница доверия на маркет-фон.рф'));
$page_title = $title_text ? ($name . ' — ' . $title_text) : $name;
$body_html = (string)($data['body_html'] ?? '');
$canonical_url = 'https://xn----7Sbptikgmuv.xn--p1ai/sales-doc/doc/' . $slug;

?><!DOCTYPE html>
<html lang="ru" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= esc($page_title) ?> | маркет-фон.рф</title>
<meta name="description" content="<?= esc(mb_substr($description, 0, 220)) ?>">
<meta property="og:title" content="<?= esc($page_title) ?>">
<meta property="og:description" content="<?= esc(mb_substr($description, 0, 220)) ?>">
<meta property="og:site_name" content="маркет-фон.рф">
<meta property="og:type" content="profile">
<meta property="og:url" content="<?= esc($canonical_url) ?>">
<link rel="canonical" href="<?= esc($canonical_url) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/sales-doc/canvas.css?v=20260506-8">
<style>
    body { background:#eef1f5; }
    .pub-topbar {
        position:sticky; top:0; z-index:500;
        min-height:54px; padding:10px 18px;
        display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;
        background:rgba(255,255,255,.92); backdrop-filter:blur(14px);
        border-bottom:1px solid rgba(15,23,42,.08);
    }
    .pub-brand { display:flex; align-items:center; gap:10px; font-size:13px; font-weight:800; color:#111827; text-decoration:none; }
    .pub-brand small { color:#64748b; font-weight:700; }
    .pub-actions { display:flex; gap:8px; flex-wrap:wrap; }
    .pub-btn {
        border:1px solid #d7dce5; background:#fff; color:#111827;
        border-radius:8px; padding:9px 13px; font:700 13px Manrope,Arial,sans-serif;
        cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:7px;
    }
    .pub-btn.primary { background:#00aaff; color:#fff; border-color:#00aaff; }
    .pub-btn:hover { transform:translateY(-1px); }
    .pub-doc { max-width:1100px; margin:0 auto; box-shadow:0 24px 80px rgba(15,23,42,.08); }
    @media (max-width: 700px) {
        .pub-topbar { align-items:flex-start; }
        .pub-actions { width:100%; }
        .pub-btn { flex:1; justify-content:center; }
    }
    @media print {
        .pub-topbar { display:none!important; }
        body { background:#fff!important; }
        .pub-doc { max-width:none; box-shadow:none; }
        * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
        section, footer { break-inside:avoid; }
        @page { margin:1.2cm; size:A4; }
    }
</style>
</head>
<body>
<div class="pub-topbar">
    <a class="pub-brand" href="/">
        <span class="avito-dots"><span></span><span></span><span></span><span></span></span>
        <span><?= esc($name) ?></span>
        <small>SalesDoc</small>
    </a>
    <div class="pub-actions">
        <button class="pub-btn" onclick="window.print()">PDF</button>
        <button class="pub-btn" onclick="navigator.share ? navigator.share({title:document.title,url:location.href}) : navigator.clipboard.writeText(location.href)">Скопировать ссылку</button>
        <a class="pub-btn primary" href="/sales-doc/">Создать своё</a>
    </div>
</div>
<main class="pub-doc">
<?= $body_html ?>
</main>
<script>
document.addEventListener('click', function(event) {
    var link = event.target.closest('[data-sd-lightbox]');
    if (link) {
        event.preventDefault();
        openSdLightbox(link.getAttribute('href'), link.dataset.alt || '');
        return;
    }
    var faq = event.target.closest('[data-faq-toggle]');
    if (faq) {
        event.preventDefault();
        toggleFaq(faq);
    }
});
function toggleFaq(element) {
    var item = element.closest('.faq-item');
    if (!item) return;
    var isOpen = item.classList.contains('open');
    item.parentElement.querySelectorAll('.faq-item.open').forEach(function(openItem) {
        openItem.classList.remove('open');
    });
    if (!isOpen) item.classList.add('open');
}
function openSdLightbox(src, alt) {
    var old = document.querySelector('.sd-lightbox');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.className = 'sd-lightbox';
    var close = document.createElement('button');
    close.className = 'sd-lightbox-close';
    close.setAttribute('aria-label', 'Закрыть');
    close.textContent = '×';
    var figure = document.createElement('figure');
    var image = document.createElement('img');
    var caption = document.createElement('figcaption');
    image.src = String(src || '');
    image.alt = String(alt || '');
    caption.textContent = String(alt || '');
    figure.appendChild(image);
    figure.appendChild(caption);
    overlay.appendChild(close);
    overlay.appendChild(figure);
    overlay.addEventListener('click', function(event) {
        if (event.target === overlay || event.target.className === 'sd-lightbox-close') overlay.remove();
    });
    document.body.appendChild(overlay);
}
</script>
<script src="/assets/global-nav.js?v=20260506-1"></script>
</body>
</html>
