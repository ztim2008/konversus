<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/storage.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method Not Allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$slug = strtolower(trim((string)($_GET['slug'] ?? '')));
if (!preg_match('/^[a-z0-9]{6,16}$/', $slug)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Некорректный slug'], JSON_UNESCAPED_UNICODE);
    exit;
}

$doc = salesdoc_load_document($slug);

if (!$doc) {
    $file = __DIR__ . '/data/' . $slug . '.json';
    if (is_file($file)) {
        $legacy = json_decode((string)file_get_contents($file), true);
        if (is_array($legacy)) $doc = $legacy + ['storage' => 'json'];
    }
}

if (!$doc || !is_array($doc['blocks'] ?? null)) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Профиль не найден'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'ok' => true,
    'slug' => $slug,
    'v' => (int)($doc['v'] ?? 3),
    'meta' => is_array($doc['meta'] ?? null) ? $doc['meta'] : [],
    'blocks' => $doc['blocks'],
    'created_at' => (string)($doc['created_at'] ?? ''),
    'updated_at' => (string)($doc['updated_at'] ?? ''),
    'published_at' => (string)($doc['published_at'] ?? ''),
    'storage' => (string)($doc['storage'] ?? 'unknown'),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);