<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/jwt.php';
acb_cors();

$token = acb_get_bearer_token();
if ($token === null) {
    acb_send_json(['success' => false, 'error' => 'Не передан access token'], 401);
}

try {
    $payload = acb_jwt_decode($token, acb_env('ACB_JWT_SECRET'));
} catch (Throwable $e) {
    acb_send_json(['success' => false, 'error' => 'Неверный access token'], 401);
}

if (($payload['typ'] ?? '') !== 'access') {
    acb_send_json(['success' => false, 'error' => 'Неверный тип токена'], 401);
}

$userId = (int)($payload['sub'] ?? 0);
if ($userId <= 0) {
    acb_send_json(['success' => false, 'error' => 'Неверный subject'], 401);
}

$db = acb_db();
$stmt = $db->prepare('SELECT id, yandex_id, email, display_name, real_name, is_admin, created_at FROM acb_users WHERE id = ? LIMIT 1');
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!is_array($user)) {
    acb_send_json(['success' => false, 'error' => 'Пользователь не найден'], 404);
}

acb_send_json([
    'success' => true,
    'user' => $user,
]);
