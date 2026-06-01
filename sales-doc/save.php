<?php
/**
 * SalesDoc Builder — save.php
 * POST JSON → сохраняет блочный документ в /data/{slug}.json → возвращает {slug,url}
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/storage.php';

// Только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Читаем тело
$raw = file_get_contents('php://input');
if (!$raw) {
    http_response_code(400);
    echo json_encode(['error' => 'Empty body']);
    exit;
}

// Валидируем JSON
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Ограничение размера: блоки + сжатые фото в data URL
if (strlen($raw) > 6 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload too large']);
    exit;
}

// Новая схема SalesDoc v3
if (($payload['v'] ?? null) !== 3 || !is_array($payload['blocks'] ?? null)) {
    http_response_code(422);
    echo json_encode(['error' => 'SalesDoc v3 blocks required']);
    exit;
}

$allowed_block_types = [
    'nav','hero','avito','stats','services','case','gallery','about','process','pricing','reviews','faq','contacts','cta','footer'
];

function clean_text($value, int $limit = 2000) {
    return mb_substr(strip_tags((string)$value), 0, $limit);
}

function clean_value($value, int $depth = 0) {
    if ($depth > 8) return null;
    if (is_array($value)) {
        $out = [];
        $i = 0;
        foreach ($value as $key => $item) {
            if ($i++ > 80) break;
            $safe_key = is_int($key) ? $key : preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$key);
            $out[$safe_key] = clean_value($item, $depth + 1);
        }
        return $out;
    }
    if (is_bool($value) || is_int($value) || is_float($value) || $value === null) return $value;

    $str = (string)$value;
    if (preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+\/=]+$/', $str)) {
        return strlen($str) <= 900000 ? $str : '';
    }
    return clean_text($str, 4000);
}

function sanitize_body_html(string $html): string {
    $html = preg_replace('#<(script|iframe|object|embed|form|input|textarea|select|button)\b[^>]*>.*?</\1>#is', '', $html);
    $html = preg_replace('#<(script|iframe|object|embed|form|input|textarea|select|button)\b[^>]*?/?>#is', '', $html);
    $html = preg_replace('/\s+on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);
    $html = preg_replace('/(href|src)\s*=\s*("|\')\s*javascript:[^"\']*("|\')/i', '$1="#"', $html);
    return mb_substr($html, 0, 5 * 1024 * 1024);
}

$blocks = [];
foreach (array_slice($payload['blocks'], 0, 30) as $block) {
    if (!is_array($block)) continue;
    $type = (string)($block['type'] ?? '');
    if (!in_array($type, $allowed_block_types, true)) continue;
    $blocks[] = [
        'id'   => (int)($block['id'] ?? 0),
        'type' => $type,
        'data' => clean_value($block['data'] ?? []),
    ];
}

if (!$blocks) {
    http_response_code(422);
    echo json_encode(['error' => 'No valid blocks']);
    exit;
}

$meta = clean_value($payload['meta'] ?? []);
if (!is_array($meta)) $meta = [];
$meta['name'] = clean_text($meta['name'] ?? 'SalesDoc', 120);
$meta['title'] = clean_text($meta['title'] ?? $meta['name'], 180);
$meta['description'] = clean_text($meta['description'] ?? 'Короткая страница доверия на маркет-фон.рф', 220);
$meta['type'] = in_array(($meta['type'] ?? ''), ['profile','proposal','resume','portfolio'], true) ? $meta['type'] : 'profile';
$meta['theme'] = 'avito-premium';

$body_html = sanitize_body_html((string)($payload['body_html'] ?? ''));
if ($body_html === '') {
    http_response_code(422);
    echo json_encode(['error' => 'body_html required']);
    exit;
}

// Добавляем мета
$doc = [
    'v'          => 3,
    'meta'       => $meta,
    'blocks'     => $blocks,
    'body_html'  => $body_html,
    'created_at' => date('Y-m-d H:i:s'),
];

$slug = salesdoc_generate_slug(12);

try {
    salesdoc_save_document($slug, $doc);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database save failed']);
    exit;
}

// Резервная копия для совместимости и аварийного восстановления
$dir = __DIR__ . '/data';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$file = $dir . '/' . $slug . '.json';
$written = file_put_contents($file, json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
if ($written === false) {
    error_log('SalesDoc backup JSON write failed: ' . $file);
}

http_response_code(201);
echo json_encode(['slug' => $slug, 'url' => '/sales-doc/doc/' . $slug, 'storage' => 'db']);
