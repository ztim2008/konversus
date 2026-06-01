<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '', true);
$url = trim((string)($payload['url'] ?? ''));

if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(422);
    echo json_encode(['error' => 'Введите корректную ссылку Avito']);
    exit;
}

$parts = parse_url($url);
$host = mb_strtolower($parts['host'] ?? '');
if (!preg_match('/(^|\.)avito\.ru$/', $host)) {
    http_response_code(422);
    echo json_encode(['error' => 'Поддерживаются только публичные ссылки avito.ru']);
    exit;
}

function clean_import_text($value, $limit = 500) {
    $value = html_entity_decode(strip_tags((string)$value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/u', ' ', $value);
    return mb_substr(trim($value), 0, $limit);
}

function meta_content($html, $name) {
    $name = preg_quote($name, '/');
    if (preg_match('/<meta[^>]+(?:property|name)=["\']' . $name . '["\'][^>]+content=["\']([^"\']*)["\']/iu', $html, $m)) {
        return clean_import_text($m[1], 900);
    }
    if (preg_match('/<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']' . $name . '["\']/iu', $html, $m)) {
        return clean_import_text($m[1], 900);
    }
    return '';
}

function fallback_title_from_url($url) {
    $path = parse_url($url, PHP_URL_PATH) ?: '';
    $segments = array_values(array_filter(explode('/', $path)));
    $last = end($segments) ?: 'Публичная страница Avito';
    $last = preg_replace('/_\d+$/', '', $last);
    $last = mb_strtolower(str_replace(['-', '_'], ' ', $last), 'UTF-8');
    $dictionary = [
        'avitolog' => 'авитолог', 'marketolog' => 'маркетолог', 'vyvod' => 'вывод',
        'v' => 'в', 'top' => 'топ', 'i' => 'и', 'rekomendatsii' => 'рекомендации',
        'prodvizhenie' => 'продвижение', 'avito' => 'Авито', 'reklama' => 'реклама',
        'nastroyka' => 'настройка', 'profil' => 'профиль', 'magazin' => 'магазин'
    ];
    $words = preg_split('/\s+/u', $last, -1, PREG_SPLIT_NO_EMPTY);
    $words = array_map(function($word) use ($dictionary) {
        return $dictionary[$word] ?? $word;
    }, $words);
    $title = clean_import_text(implode(' ', $words), 160);
    return $title ? mb_convert_case($title, MB_CASE_TITLE, 'UTF-8') : 'Публичная страница Avito';
}

function fallback_location_from_url($url) {
    $path = parse_url($url, PHP_URL_PATH) ?: '';
    $segments = array_values(array_filter(explode('/', $path)));
    if (!$segments) return '';
    $location = mb_strtolower(str_replace(['-', '_'], ' ', $segments[0]), 'UTF-8');
    $dictionary = [
        'borovichi' => 'Боровичи',
        'moskva' => 'Москва',
        'sankt peterburg' => 'Санкт-Петербург',
        'novosibirsk' => 'Новосибирск',
        'ekaterinburg' => 'Екатеринбург',
        'kazan' => 'Казань'
    ];
    return clean_import_text($dictionary[$location] ?? mb_convert_case($location, MB_CASE_TITLE, 'UTF-8'), 80);
}

$result = [
    'ok' => false,
    'blocked' => false,
    'url' => $url,
    'title' => fallback_title_from_url($url),
    'description' => 'Публичная страница на Avito. Ссылка сохранена, описание можно уточнить вручную.',
    'imageUrl' => '',
    'location' => fallback_location_from_url($url),
    'source' => 'avito',
];

if (!function_exists('curl_init')) {
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    CURLOPT_HTTPHEADER => [
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: ru-RU,ru;q=0.9,en;q=0.6',
    ],
]);
$html = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if (!is_string($html) || $html === '' || $status >= 400 || stripos($html, 'Доступ ограничен') !== false) {
    $result['blocked'] = true;
    $result['httpStatus'] = $status;
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$title = meta_content($html, 'og:title');
if ($title === '' && preg_match('/<title[^>]*>(.*?)<\/title>/isu', $html, $m)) {
    $title = clean_import_text($m[1], 180);
}
$description = meta_content($html, 'og:description') ?: meta_content($html, 'description');
$image = meta_content($html, 'og:image');

$result['ok'] = true;
if ($title !== '') $result['title'] = $title;
if ($description !== '') $result['description'] = $description;
if ($image !== '' && filter_var($image, FILTER_VALIDATE_URL)) $result['imageUrl'] = $image;

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);