<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/audit-lib.php';
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
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET') {
    acb_send_json(['success' => false, 'error' => 'Method not allowed'], 405);
}

try {
    $id = $_GET['id'] ?? '';
    $listing = null;

    if (is_string($id) && trim($id) !== '') {
        $stmt = $db->prepare('SELECT id, user_id, template_id, title, description, status, archived_at, created_at, updated_at FROM acb_listings WHERE id = ? AND user_id = ? AND archived_at IS NULL LIMIT 1');
        $stmt->execute([(int)$id, $userId]);
        $listing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($listing)) {
            acb_send_json(['success' => false, 'error' => 'Объявление не найдено'], 404);
        }
    } else {
        $stmt = $db->prepare('SELECT id, user_id, template_id, title, description, status, archived_at, created_at, updated_at FROM acb_listings WHERE user_id = ? AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 1');
        $stmt->execute([$userId]);
        $listing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($listing)) {
            acb_send_json(['success' => false, 'error' => 'Нет объявлений для аудита'], 404);
        }
    }

    $model = acb_audit_build_model($listing, ['source_mode' => 'core_listing']);
    $persist = acb_audit_persist($db, $userId, null, $model);

    acb_send_json([
        'success' => true,
        'listing' => $listing,
        'audit' => $model,
        'persistence' => $persist,
    ]);
} catch (Throwable $e) {
    acb_send_json(['success' => false, 'error' => 'Ошибка сервера'], 500);
}