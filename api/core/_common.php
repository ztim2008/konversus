<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

acb_load_env_file_once();

function acb_load_env_file_once(): void {
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;

    $envFile = getenv('ACB_ENV_FILE');
    if (!is_string($envFile) || trim($envFile) === '') {
        // В web-окружении может быть включен open_basedir, поэтому дефолт держим внутри /var/www.
        $envFile = '/var/www/www-root/data/.acb-core.env';
    }

    if (!is_readable($envFile)) {
        return;
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) {
        return;
    }

    foreach ($lines as $line) {
        if (!is_string($line)) {
            continue;
        }
        $trim = trim($line);
        if ($trim === '' || str_starts_with($trim, '#')) {
            continue;
        }
        $pos = strpos($trim, '=');
        if ($pos === false) {
            continue;
        }
        $key = trim(substr($trim, 0, $pos));
        $value = trim(substr($trim, $pos + 1));
        if ($key === '') {
            continue;
        }
        // Не перетираем уже заданные переменные окружения
        $existing = getenv($key);
        if (is_string($existing) && trim($existing) !== '') {
            continue;
        }
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }
}

function acb_cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    $allowed = getenv('ACB_CORS_ORIGINS');
    $allowedOrigins = [];
    if (is_string($allowed) && trim($allowed) !== '') {
        $allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $allowed))));
    }

    if ($origin !== '' && (empty($allowedOrigins) || in_array($origin, $allowedOrigins, true))) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        exit(0);
    }
}

function acb_send_json($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function acb_read_json_body(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        acb_send_json([
            'success' => false,
            'error' => 'Некорректный JSON в теле запроса'
        ], 400);
    }

    return $decoded;
}

function acb_env(string $key): string {
    $value = getenv($key);
    if (!is_string($value) || trim($value) === '') {
        acb_send_json([
            'success' => false,
            'error' => 'Не настроена переменная окружения: ' . $key
        ], 500);
    }

    return $value;
}

function acb_db(): PDO {
    require_once __DIR__ . '/../config.php';
    return getDB();
}

function acb_get_bearer_token(): ?string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!is_string($auth) || $auth === '') {
        // На некоторых связках (например, nginx + php-fpm) Authorization может не попасть в $_SERVER.
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            if (is_array($headers)) {
                foreach ($headers as $k => $v) {
                    if (is_string($k) && is_string($v) && strcasecmp($k, 'Authorization') === 0) {
                        $auth = $v;
                        break;
                    }
                }
            }
        }
        if (!is_string($auth) || $auth === '') {
            return null;
        }
    }
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m) !== 1) {
        return null;
    }
    return trim($m[1]);
}


function acb_cookie_set(string $name, string $value, int $maxAgeSeconds): void {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $params = [
        'expires' => time() + $maxAgeSeconds,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ];
    setcookie($name, $value, $params);
}

function acb_cookie_clear(string $name): void {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $params = [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ];
    setcookie($name, '', $params);
}

function acb_cookie_get(string $name): ?string {
    $v = $_COOKIE[$name] ?? null;
    if (!is_string($v) || $v === '') {
        return null;
    }
    return $v;
}
