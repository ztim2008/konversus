<?php
/**
 * Конфигурация подключения к MySQL и локальных секретов.
 * Чувствительные значения должны жить в avitoeditor/.env или в переменных окружения.
 */

function avitoeditor_load_env(): array {
    static $vars = null;

    if ($vars !== null) {
        return $vars;
    }

    $vars = [];
    $envPath = dirname(__DIR__) . '/.env';

    if (is_readable($envPath)) {
        $parsed = parse_ini_file($envPath, false, INI_SCANNER_RAW);
        if (is_array($parsed)) {
            foreach ($parsed as $key => $value) {
                $vars[$key] = is_string($value) ? trim($value) : $value;
            }
        }
    }

    return $vars;
}

function avitoeditor_env(string $key, ?string $default = null): ?string {
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }

    $vars = avitoeditor_load_env();
    if (array_key_exists($key, $vars) && $vars[$key] !== '') {
        return (string)$vars[$key];
    }

    return $default;
}

function avitoeditor_admin_password_hash(): string {
    return (string)avitoeditor_env('ADMIN_PASSWORD_HASH', '');
}

function avitoeditor_payment_config_path(): string {
    return dirname(__DIR__) . '/config/payment-config.local.json';
}

function avitoeditor_payment_config_candidates(): array {
    $paths = [
        avitoeditor_env('AVITOEDITOR_PAYMENT_CONFIG_PATH'),
        avitoeditor_payment_config_path(),
        __DIR__ . '/payment-config.local.json',
        __DIR__ . '/payment-config.json',
        dirname(__DIR__) . '/config/payment-config.json',
    ];

    return array_values(array_filter($paths, static function ($path) {
        return is_string($path) && $path !== '';
    }));
}

function avitoeditor_load_payment_config(): array {
    foreach (avitoeditor_payment_config_candidates() as $path) {
        if (!is_file($path) || !is_readable($path)) {
            continue;
        }

        $decoded = json_decode((string)file_get_contents($path), true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    return [
        'shop_id' => (string)avitoeditor_env('YUKASSA_SHOP_ID', ''),
        'secret_key' => (string)avitoeditor_env('YUKASSA_SECRET_KEY', ''),
        'test_mode' => false,
        'dev_mode' => false,
        'template_price' => 700,
        'subscription_monthly' => 700,
        'subscription_yearly' => 7000,
    ];
}

// Данные для подключения к MySQL
define('DB_HOST', (string)avitoeditor_env('DB_HOST', 'localhost'));
define('DB_NAME', (string)avitoeditor_env('DB_NAME', ''));
define('DB_USER', (string)avitoeditor_env('DB_USER', ''));
define('DB_PASS', (string)avitoeditor_env('DB_PASSWORD', ''));
define('DB_CHARSET', (string)avitoeditor_env('DB_CHARSET', 'utf8mb4'));

// Пути для загрузки файлов
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads/templates/');
define('THUMBNAIL_DIR', UPLOAD_DIR . 'thumbnails/');
define('PREVIEW_DIR', UPLOAD_DIR . 'previews/');

// URL для доступа к загруженным файлам
define('UPLOAD_URL', '/avitoeditor/uploads/templates/');
define('THUMBNAIL_URL', UPLOAD_URL . 'thumbnails/');
define('PREVIEW_URL', UPLOAD_URL . 'previews/');

// Максимальный размер файла (5MB)
define('MAX_FILE_SIZE', 5 * 1024 * 1024);

// Разрешённые типы изображений
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * Получить PDO подключение к базе данных
 */
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Database connection failed']));
        }
    }
    
    return $pdo;
}

/**
 * Создать директории для загрузки если их нет
 */
function ensureUploadDirs() {
    if (!file_exists(THUMBNAIL_DIR)) {
        mkdir(THUMBNAIL_DIR, 0755, true);
    }
    if (!file_exists(PREVIEW_DIR)) {
        mkdir(PREVIEW_DIR, 0755, true);
    }
}
