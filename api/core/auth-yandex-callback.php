<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/jwt.php';
acb_cors();

if (!function_exists('curl_init')) {
    acb_send_json([
        'success' => false,
        'error' => 'На сервере не включено расширение PHP cURL (нужно для OAuth)'
    ], 500);
}

$oauthError = $_GET['error'] ?? null;
if (is_string($oauthError) && $oauthError !== '') {
    acb_send_json([
        'success' => false,
        'error' => 'Ошибка OAuth от Яндекса: ' . $oauthError,
        'description' => (is_string($_GET['error_description'] ?? null) ? (string)$_GET['error_description'] : null),
    ], 400);
}

$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
if (!is_string($code) || $code === '' || !is_string($state) || $state === '') {
    acb_send_json([
        'success' => false,
        'error' => 'Не хватает параметров OAuth (code/state)'
    ], 400);
}

$stateCookie = acb_cookie_get('acb_yandex_oauth_state');
if ($stateCookie === null || !hash_equals($stateCookie, $state)) {
    acb_send_json([
        'success' => false,
        'error' => 'Некорректный state (возможна подмена запроса)'
    ], 400);
}

acb_cookie_clear('acb_yandex_oauth_state');

$clientId = acb_env('ACB_YANDEX_CLIENT_ID');
$clientSecret = acb_env('ACB_YANDEX_CLIENT_SECRET');
$redirectUri = acb_env('ACB_YANDEX_REDIRECT_URI');

$tokenResp = acb_yandex_exchange_code($code, $clientId, $clientSecret, $redirectUri);
$yandexAccessToken = $tokenResp['access_token'] ?? null;
if (!is_string($yandexAccessToken) || $yandexAccessToken === '') {
    acb_send_json([
        'success' => false,
        'error' => 'Не удалось получить access_token от Яндекса'
    ], 502);
}

$info = acb_yandex_get_user_info($yandexAccessToken);

$yandexId = $info['id'] ?? null;
if (!is_string($yandexId) || $yandexId === '') {
    acb_send_json([
        'success' => false,
        'error' => 'Яндекс не вернул идентификатор пользователя'
    ], 502);
}

$db = acb_db();
$user = acb_upsert_user($db, $info);

$jwtSecret = acb_env('ACB_JWT_SECRET');
$accessTtl = (int)(getenv('ACB_JWT_ACCESS_TTL_SECONDS') ?: 900);
if ($accessTtl <= 0) {
    $accessTtl = 900;
}

$now = time();
$accessPayload = [
    'sub' => (string)$user['id'],
    'typ' => 'access',
    'iat' => $now,
    'exp' => $now + $accessTtl,
];
$accessJwt = acb_jwt_encode($accessPayload, $jwtSecret);

$refreshTtl = (int)(getenv('ACB_REFRESH_TTL_SECONDS') ?: 30 * 24 * 3600);
if ($refreshTtl <= 0) {
    $refreshTtl = 30 * 24 * 3600;
}

$refreshToken = bin2hex(random_bytes(32));
acb_store_refresh_token($db, (int)$user['id'], $refreshToken, $now + $refreshTtl);

$payload = [
    'success' => true,
    'user' => $user,
    'access_token' => $accessJwt,
    'access_expires_in' => $accessTtl,
    'refresh_token' => $refreshToken,
    'refresh_expires_in' => $refreshTtl,
    'yandex' => [
        'id' => $yandexId,
        'default_email' => $info['default_email'] ?? null,
        'display_name' => $info['display_name'] ?? null,
    ],
];

if (acb_client_wants_html()) {
    acb_send_oauth_html_success($payload);
}

acb_send_json($payload);

function acb_client_wants_html(): bool {
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    if (!is_string($accept) || $accept === '') {
        return false;
    }
    return (stripos($accept, 'text/html') !== false);
}

function acb_send_oauth_html_success(array $payload): void {
    if (!headers_sent()) {
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }

    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        $json = '{"success":false,"error":"Не удалось сформировать ответ"}';
    }

    echo '<!doctype html><html lang="ru"><head>';
    echo '<meta charset="utf-8" />';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1" />';
    echo '<title>Вход выполнен</title>';
    echo '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#f0f0f1;color:#1d2327;margin:0;padding:24px}';
    echo '.card{max-width:720px;margin:0 auto;background:#fff;border:1px solid #dcdcde;border-radius:10px;padding:18px}';
    echo 'h1{font-size:18px;margin:0 0 10px}p{margin:0;color:#50575e}';
    echo '.btn{display:inline-block;margin-top:12px;padding:10px 12px;border-radius:8px;border:1px solid #2271b1;background:#2271b1;color:#fff;text-decoration:none;font-weight:600;font-size:13px}';
    echo '</style></head><body>';
    echo '<div class="card">';
    echo '<h1>Вход выполнен</h1>';
    echo '<p>Перенаправляем в личный кабинет...</p>';
    echo '<a class="btn" href="/cabinet/">Открыть кабинет</a>';
    echo '</div>';
    echo '<script>';
    echo 'try {';
    echo 'const data=' . $json . ';';
    echo 'if(data && data.success){';
    echo 'localStorage.setItem("acb_access_token", data.access_token || "");';
    echo 'localStorage.setItem("acb_refresh_token", data.refresh_token || "");';
    echo 'const expMs=Date.now()+Math.max(0,(Number(data.access_expires_in)||0)-30)*1000;';
    echo 'localStorage.setItem("acb_access_exp", String(expMs));';
    echo '}';
    echo '} catch(e) {}';
    echo 'setTimeout(function(){ window.location.href="/cabinet/#/dashboard"; }, 250);';
    echo '</script>';
    echo '</body></html>';
    exit;
}

function acb_yandex_exchange_code(string $code, string $clientId, string $clientSecret, string $redirectUri): array {
    $ch = curl_init('https://oauth.yandex.ru/token');
    if ($ch === false) {
        throw new RuntimeException('curl_init failed');
    }

    $post = http_build_query([
        'grant_type' => 'authorization_code',
        'code' => $code,
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => $redirectUri,
    ]);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $post,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT => 10,
    ]);

    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        acb_send_json([
            'success' => false,
            'error' => 'Ошибка запроса к Яндексу (token): ' . $err
        ], 502);
    }

    $json = json_decode((string)$body, true);
    if (!is_array($json)) {
        acb_send_json([
            'success' => false,
            'error' => 'Яндекс вернул некорректный ответ (token)'
        ], 502);
    }

    if ($status < 200 || $status >= 300) {
        acb_send_json([
            'success' => false,
            'error' => 'Яндекс вернул ошибку при обмене кода на токен',
            'details' => $json,
        ], 502);
    }

    return $json;
}

function acb_yandex_get_user_info(string $accessToken): array {
    $url = 'https://login.yandex.ru/info?format=json';
    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('curl_init failed');
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPGET => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: OAuth ' . $accessToken,
        ],
        CURLOPT_TIMEOUT => 10,
    ]);

    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        acb_send_json([
            'success' => false,
            'error' => 'Ошибка запроса к Яндексу (info): ' . $err
        ], 502);
    }

    $json = json_decode((string)$body, true);
    if (!is_array($json)) {
        acb_send_json([
            'success' => false,
            'error' => 'Яндекс вернул некорректный ответ (info)'
        ], 502);
    }

    if ($status < 200 || $status >= 300) {
        acb_send_json([
            'success' => false,
            'error' => 'Яндекс вернул ошибку при получении профиля',
            'details' => $json,
        ], 502);
    }

    return $json;
}

function acb_upsert_user(PDO $db, array $yandexInfo): array {
    $yandexId = (string)($yandexInfo['id'] ?? '');
    $email = $yandexInfo['default_email'] ?? null;
    $displayName = $yandexInfo['display_name'] ?? null;
    $realName = $yandexInfo['real_name'] ?? null;

    $stmt = $db->prepare('SELECT id, yandex_id, email, display_name, real_name, is_admin, created_at FROM acb_users WHERE yandex_id = ? LIMIT 1');
    $stmt->execute([$yandexId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if (is_array($existing)) {
        $upd = $db->prepare('UPDATE acb_users SET email = ?, display_name = ?, real_name = ?, updated_at = NOW() WHERE id = ?');
        $upd->execute([$email, $displayName, $realName, (int)$existing['id']]);
        $existing['email'] = $email;
        $existing['display_name'] = $displayName;
        $existing['real_name'] = $realName;

        // Авто-выдача админки по списку email (только повышаем права, не понижаем)
        if (acb_is_admin_email($email) && (int)($existing['is_admin'] ?? 0) !== 1) {
            $db->prepare('UPDATE acb_users SET is_admin = 1 WHERE id = ?')->execute([(int)$existing['id']]);
            $existing['is_admin'] = 1;
        }
        return $existing;
    }

    $isAdmin = acb_is_admin_email($email) ? 1 : 0;

    $ins = $db->prepare('INSERT INTO acb_users (yandex_id, email, display_name, real_name, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
    $ins->execute([$yandexId, $email, $displayName, $realName, $isAdmin]);
    $id = (int)$db->lastInsertId();

    return [
        'id' => $id,
        'yandex_id' => $yandexId,
        'email' => $email,
        'display_name' => $displayName,
        'real_name' => $realName,
        'is_admin' => $isAdmin,
        'created_at' => date('Y-m-d H:i:s'),
    ];
}

function acb_is_admin_email($email): bool {
    if (!is_string($email) || trim($email) === '') {
        return false;
    }
    $email = strtolower(trim($email));

    $raw = getenv('ACB_ADMIN_EMAILS');
    if (!is_string($raw) || trim($raw) === '') {
        return false;
    }

    $parts = array_values(array_filter(array_map('trim', explode(',', $raw))));
    foreach ($parts as $p) {
        if ($p === '') {
            continue;
        }
        if (strtolower($p) === $email) {
            return true;
        }
    }

    return false;
}

function acb_store_refresh_token(PDO $db, int $userId, string $refreshToken, int $expiresAtUnix): void {
    $hash = hash('sha256', $refreshToken);
    $stmt = $db->prepare('INSERT INTO acb_refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, FROM_UNIXTIME(?), NOW())');
    $stmt->execute([$userId, $hash, $expiresAtUnix]);
}
