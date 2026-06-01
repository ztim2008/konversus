<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$config_path = dirname(__DIR__) . '/ai-config.local.php';
if (!is_file($config_path)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'AI config not found'], JSON_UNESCAPED_UNICODE);
    exit;
}

$config = require $config_path;
$api_key = (string)($config['api_key'] ?? '');
if ($api_key === '') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'AI key is empty'], JSON_UNESCAPED_UNICODE);
    exit;
}

function salesdoc_ai_fail(int $status, string $message, array $extra = []): void {
    http_response_code($status);
    echo json_encode(array_merge(['ok' => false, 'error' => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

function salesdoc_ai_clean($value, int $limit = 2500) {
    if (is_array($value)) {
        $clean = [];
        foreach ($value as $key => $item) {
            $safe_key = is_int($key) ? $key : preg_replace('/[^a-zA-Z0-9_]/', '', (string)$key);
            if ($safe_key === '') continue;
            $clean[$safe_key] = salesdoc_ai_clean($item, $limit);
        }
        return $clean;
    }
    if (is_bool($value) || is_int($value) || is_float($value) || $value === null) return $value;
    $text = trim(strip_tags((string)$value));
    return mb_substr($text, 0, $limit);
}

function salesdoc_ai_extract_json(string $content): ?array {
    $content = trim($content);
    $decoded = json_decode($content, true);
    if (is_array($decoded)) return $decoded;

    if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/su', $content, $match)) {
        $decoded = json_decode($match[1], true);
        if (is_array($decoded)) return $decoded;
    }

    $start = strpos($content, '{');
    $end = strrpos($content, '}');
    if ($start !== false && $end !== false && $end > $start) {
        $json = substr($content, $start, $end - $start + 1);
        $decoded = json_decode($json, true);
        if (is_array($decoded)) return $decoded;
    }
    return null;
}

function salesdoc_ai_mode_hint(string $mode): string {
    if ($mode === 'profile_generate') {
        return 'Сгенерируй цельный короткий профиль доверия на основе данных wizard. Верни blocks: массив объектов {type,data}. Используй только переданные типы блоков и сохраняй структуру data каждого блока. Заполни тексты, подписи, SEO alt, кейсы и услуги так, чтобы профиль выглядел готовым к отправке клиенту в мессенджере. Не меняй ссылки, телефоны, imageUrl, photoUrl.';
    }
    if ($mode === 'profile_audit') {
        return 'Проведи быстрый аудит готового SalesDoc перед публикацией. Оцени ясность оффера, доверие, доказательства, CTA, контакты и SEO-подписи. Верни score от 0 до 100, ready boolean, findings массив из 3-6 пунктов {level,title,text}, quickWins массив коротких действий. Не переписывай сам профиль.';
    }
    if ($mode === 'media_seo') {
        return 'Сфокусируйся на SEO alt, caption, imageAlt, photoAlt, подписях к фото и названиях работ. Не меняй цены, телефоны, ссылки, imageUrl/photoUrl.';
    }
    if ($mode === 'fill_empty') {
        return 'Заполни только пустые или слабые поля блока. Существующие сильные значения оставь близкими по смыслу.';
    }
    return 'Улучши текст блока: сделай яснее, убедительнее, конкретнее и спокойнее. Не добавляй инфобизнес-стиль, капс, обещания без доказательств.';
}

$rate_dir = dirname(__DIR__) . '/cache/data/salesdoc_ai_rate/';
if (!is_dir($rate_dir) && !mkdir($rate_dir, 0755, true)) {
    salesdoc_ai_fail(500, 'Rate directory unavailable');
}
$ip_hash = hash('sha256', ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '') . 'salesdoc_ai_2026');
$rate_file = $rate_dir . $ip_hash . '.json';
$now = time();
$window = 3600;
$limit = 25;
$rate = is_file($rate_file) ? json_decode((string)file_get_contents($rate_file), true) : ['count' => 0, 'reset' => $now + $window];
if (!is_array($rate) || $now > (int)($rate['reset'] ?? 0)) $rate = ['count' => 0, 'reset' => $now + $window];
if ((int)($rate['count'] ?? 0) >= $limit) salesdoc_ai_fail(429, 'AI limit exceeded. Попробуйте позже.');
$rate['count'] = (int)$rate['count'] + 1;
file_put_contents($rate_file, json_encode($rate), LOCK_EX);

$payload = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($payload)) salesdoc_ai_fail(400, 'Invalid JSON');

$allowed_modes = ['block_rewrite', 'media_seo', 'fill_empty', 'profile_generate', 'profile_audit'];
$mode = in_array(($payload['mode'] ?? ''), $allowed_modes, true) ? (string)$payload['mode'] : 'block_rewrite';
$block_type = preg_replace('/[^a-z_]/', '', strtolower((string)($payload['blockType'] ?? '')));
if ($block_type === '' && !in_array($mode, ['profile_generate', 'profile_audit'], true)) salesdoc_ai_fail(400, 'blockType required');

$context = salesdoc_ai_clean($payload['context'] ?? [], 1200);
$data = salesdoc_ai_clean($payload['data'] ?? [], 2500);
if (!is_array($data)) salesdoc_ai_fail(400, 'data object required');

$system = 'Ты AI-редактор SalesDoc для маркет-фон.рф. Продукт: короткий messenger-first профиль доверия для авитологов и специалистов Avito. Пиши по-русски, конкретно, спокойно, премиально, без воды, без агрессивного инфобизнеса. Верни только валидный JSON без markdown. Сохраняй структуру блока и типы данных. Не меняй URL, телефоны, imageUrl, photoUrl, slug, id. Не добавляй HTML.';

$user = [
    'task' => salesdoc_ai_mode_hint($mode),
    'blockType' => $block_type,
    'context' => $context,
    'currentData' => $data,
    'returnFormat' => $mode === 'profile_generate'
        ? ['blocks' => 'массив объектов {type,data}; type должен совпадать с одним из переданных блоков', 'note' => 'коротко: что создано, 1 предложение']
        : ($mode === 'profile_audit'
            ? ['data' => ['score' => '0-100', 'ready' => 'boolean', 'findings' => 'массив {level,title,text}', 'quickWins' => 'массив строк'], 'note' => 'коротко: итог аудита']
            : ['data' => 'объект block.data той же структуры, с улучшенными текстами', 'note' => 'коротко: что улучшено, 1 предложение']),
];

$request_body = json_encode([
    'model' => (string)($config['default_model'] ?? 'meta-llama/llama-3.3-70b-instruct'),
    'messages' => [
        ['role' => 'system', 'content' => $system],
        ['role' => 'user', 'content' => json_encode($user, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)],
    ],
    'response_format' => ['type' => 'json_object'],
    'max_tokens' => $mode === 'profile_generate' ? 2600 : ($mode === 'profile_audit' ? 1600 : 1300),
    'temperature' => 0.45,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$curl = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $request_body,
    CURLOPT_TIMEOUT => 35,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $api_key,
        'HTTP-Referer: ' . (string)($config['site_url'] ?? 'https://xn----7sbptikgmuv.xn--p1ai'),
        'X-Title: ' . (string)($config['site_name'] ?? 'маркет-фон.рф'),
    ],
]);

$response = curl_exec($curl);
$http_status = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
$curl_error = curl_error($curl);
curl_close($curl);

if ($curl_error !== '') salesdoc_ai_fail(502, 'AI connection error', ['detail' => $curl_error]);
if ($http_status < 200 || $http_status >= 300) salesdoc_ai_fail(502, 'AI provider error', ['status' => $http_status]);

$decoded = json_decode((string)$response, true);
$content = (string)($decoded['choices'][0]['message']['content'] ?? '');
$result = salesdoc_ai_extract_json($content);
if (!is_array($result)) {
    salesdoc_ai_fail(502, 'AI returned invalid JSON');
}

if ($mode === 'profile_generate') {
    $result_blocks = $result['blocks'] ?? ($result['data']['blocks'] ?? null);
    if (!is_array($result_blocks)) salesdoc_ai_fail(502, 'AI returned invalid profile JSON');
    echo json_encode([
        'ok' => true,
        'mode' => $mode,
        'blockType' => $block_type,
        'blocks' => salesdoc_ai_clean($result_blocks, 3000),
        'note' => mb_substr(trim(strip_tags((string)($result['note'] ?? 'Профиль создан AI'))), 0, 300),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$result_data = $result['data'] ?? null;
if ($mode === 'profile_audit' && !is_array($result_data)) {
    $audit_keys = ['score', 'ready', 'findings', 'quickWins'];
    $has_audit_keys = false;
    foreach ($audit_keys as $audit_key) {
        if (array_key_exists($audit_key, $result)) $has_audit_keys = true;
    }
    if ($has_audit_keys) {
        $result_data = [
            'score' => $result['score'] ?? 0,
            'ready' => $result['ready'] ?? false,
            'findings' => $result['findings'] ?? [],
            'quickWins' => $result['quickWins'] ?? [],
        ];
    }
}

if (!is_array($result_data)) salesdoc_ai_fail(502, 'AI returned invalid JSON');

echo json_encode([
    'ok' => true,
    'mode' => $mode,
    'blockType' => $block_type,
    'data' => salesdoc_ai_clean($result_data, 3000),
    'note' => mb_substr(trim(strip_tags((string)($result['note'] ?? ($mode === 'profile_audit' ? 'AI аудит готов' : 'Блок улучшен')))), 0, 300),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);