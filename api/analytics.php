<?php
/**
 * Analytics Endpoint
 * Принимает события от редактора и сохраняет в файл/базу данных
 */

// Настройки
define('ANALYTICS_FILE', __DIR__ . '/analytics.log');
define('ANALYTICS_JSON', __DIR__ . '/analytics.json');
define('RATE_LIMIT_FILE', __DIR__ . '/rate_limit.json');

// CORS headers - только разрешённые домены
$allowedOrigins = [
    'https://инфобаннер.рф',
    'https://xn--80abnjzcaex7a.xn--p1ai',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Разрешаем, если нет Origin (прямые запросы с того же домена)
    if (empty($origin)) {
        header('Access-Control-Allow-Origin: *');
    }
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Обработка preflight запроса
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Принимаем только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Rate limiting: максимум 100 событий в минуту с одного IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$currentMinute = date('Y-m-d H:i');

$rateLimits = [];
if (file_exists(RATE_LIMIT_FILE)) {
    $rateLimits = json_decode(file_get_contents(RATE_LIMIT_FILE), true) ?: [];
}

$key = $ip . '_' . $currentMinute;
$count = $rateLimits[$key] ?? 0;

if ($count > 100) {
    http_response_code(429);
    echo json_encode(['error' => 'Rate limit exceeded']);
    exit;
}

$rateLimits[$key] = $count + 1;

// Очистка старых записей (старше 5 минут)
$cutoff = strtotime('-5 minutes');
foreach (array_keys($rateLimits) as $k) {
    $parts = explode('_', $k);
    if (count($parts) >= 2) {
        $keyTime = strtotime($parts[1] . ' ' . ($parts[2] ?? ''));
        if ($keyTime && $keyTime < $cutoff) {
            unset($rateLimits[$k]);
        }
    }
}

file_put_contents(RATE_LIMIT_FILE, json_encode($rateLimits));

// Читаем данные
$json = file_get_contents('php://input');

// Ограничиваем размер запроса (max 10KB)
if (strlen($json) > 10240) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload too large']);
    exit;
}

$data = json_decode($json, true);

// Валидация обязательных полей
if (!$data || !isset($data['event']) || !is_string($data['event'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid data']);
    exit;
}

// Белый список разрешённых событий
$allowedEvents = [
    'editor_opened',
    'image_exported',
    'text_template_used',
    'template_loaded',
    'project_saved'
];

if (!in_array($data['event'], $allowedEvents)) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown event type']);
    exit;
}

// Валидация данных события
if (isset($data['data']) && !is_array($data['data'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid event data']);
    exit;
}

// Добавляем служебную информацию
$event = [
    'event' => htmlspecialchars($data['event'], ENT_QUOTES, 'UTF-8'),
    'data' => $data['data'] ?? [],
    'timestamp' => $data['timestamp'] ?? date('c'),
    'page' => htmlspecialchars($data['page'] ?? '', ENT_QUOTES, 'UTF-8'),
    'referrer' => htmlspecialchars($data['referrer'] ?? '', ENT_QUOTES, 'UTF-8'),
    'ip' => preg_replace('/\.(\d+)$/', '.XXX', $_SERVER['REMOTE_ADDR'] ?? 'unknown'), // Анонимизация IP
    'user_agent' => htmlspecialchars($_SERVER['HTTP_USER_AGENT'] ?? 'unknown', ENT_QUOTES, 'UTF-8')
];

// Сохраняем в текстовый лог (простой формат)
$logLine = sprintf(
    "[%s] %s | Page: %s | IP: %s\n",
    $event['timestamp'],
    $event['event'],
    $event['page'],
    $event['ip']
);

file_put_contents(ANALYTICS_FILE, $logLine, FILE_APPEND | LOCK_EX);

// Сохраняем в JSON (для подробного анализа)
$jsonData = [];
if (file_exists(ANALYTICS_JSON)) {
    $jsonData = json_decode(file_get_contents(ANALYTICS_JSON), true) ?: [];
}

$jsonData[] = $event;

// Ограничиваем размер файла (max 10MB)
$maxFileSize = 10 * 1024 * 1024; // 10MB
if (file_exists(ANALYTICS_JSON) && filesize(ANALYTICS_JSON) > $maxFileSize) {
    // Оставляем только половину событий
    $jsonData = array_slice($jsonData, -5000);
}

// Ограничиваем количество событий (храним последние 10000)
if (count($jsonData) > 10000) {
    $jsonData = array_slice($jsonData, -10000);
}

file_put_contents(ANALYTICS_JSON, json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// Возвращаем успех
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Event tracked'
]);
