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
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    switch ($method) {
        case 'GET':
            acb_listings_get($db, $userId);
            break;
        case 'POST':
            acb_listings_post($db, $userId);
            break;
        case 'PUT':
            acb_listings_put($db, $userId);
            break;
        case 'DELETE':
            acb_listings_delete($db, $userId);
            break;
        default:
            acb_send_json(['success' => false, 'error' => 'Method not allowed'], 405);
    }
} catch (Throwable $e) {
    acb_send_json(['success' => false, 'error' => 'Ошибка сервера'], 500);
}

function acb_listings_get(PDO $db, int $userId): void {
    $id = $_GET['id'] ?? null;
    if (is_string($id) && $id !== '') {
        $stmt = $db->prepare('SELECT id, user_id, template_id, title, description, status, archived_at, created_at, updated_at FROM acb_listings WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([(int)$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            acb_send_json(['success' => false, 'error' => 'Объявление не найдено'], 404);
        }
        acb_send_json(['success' => true, 'listing' => $row]);
    }

    $stmt = $db->prepare('SELECT id, user_id, template_id, title, description, status, archived_at, created_at, updated_at FROM acb_listings WHERE user_id = ? AND archived_at IS NULL ORDER BY updated_at DESC');
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    acb_send_json(['success' => true, 'listings' => $rows]);
}

function acb_listings_post(PDO $db, int $userId): void {
    $input = acb_read_json_body();
    $title = $input['title'] ?? '';
    $description = $input['description'] ?? '';
    $templateId = $input['template_id'] ?? null;

    if (!is_string($title) || trim($title) === '') {
        acb_send_json(['success' => false, 'error' => 'title обязателен'], 400);
    }

    if (!is_string($description)) {
        $description = '';
    }

    if (is_string($templateId)) {
        $templateId = trim($templateId);
        if ($templateId === '') {
            $templateId = null;
        }
    } else {
        $templateId = null;
    }

    $stmt = $db->prepare('INSERT INTO acb_listings (user_id, template_id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
    $stmt->execute([$userId, $templateId, trim($title), $description, 'draft']);
    $id = (int)$db->lastInsertId();

    acb_send_json([
        'success' => true,
        'id' => $id,
    ], 201);
}

function acb_listings_put(PDO $db, int $userId): void {
    $id = $_GET['id'] ?? '';
    if (!is_string($id) || trim($id) === '') {
        acb_send_json(['success' => false, 'error' => 'id обязателен'], 400);
    }

    $input = acb_read_json_body();
    $title = $input['title'] ?? null;
    $description = $input['description'] ?? null;
    $templateId = $input['template_id'] ?? null;

    $stmt = $db->prepare('SELECT id FROM acb_listings WHERE id = ? AND user_id = ? AND archived_at IS NULL LIMIT 1');
    $stmt->execute([(int)$id, $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!is_array($row)) {
        acb_send_json(['success' => false, 'error' => 'Объявление не найдено'], 404);
    }

    $fields = [];
    $params = [];

    if (is_string($title)) {
        if (trim($title) === '') {
            acb_send_json(['success' => false, 'error' => 'title не может быть пустым'], 400);
        }
        $fields[] = 'title = ?';
        $params[] = trim($title);
    }

    if (is_string($description)) {
        $fields[] = 'description = ?';
        $params[] = $description;
    }

    if (is_string($templateId)) {
        $templateId = trim($templateId);
        if ($templateId === '') {
            $fields[] = 'template_id = NULL';
        } else {
            $fields[] = 'template_id = ?';
            $params[] = $templateId;
        }
    }

    if (empty($fields)) {
        acb_send_json(['success' => false, 'error' => 'Нет полей для обновления'], 400);
    }

    $fields[] = 'updated_at = NOW()';
    $params[] = (int)$id;
    $params[] = $userId;

    $sql = 'UPDATE acb_listings SET ' . implode(', ', $fields) . ' WHERE id = ? AND user_id = ?';
    $upd = $db->prepare($sql);
    $upd->execute($params);

    acb_send_json(['success' => true]);
}

function acb_listings_delete(PDO $db, int $userId): void {
    $id = $_GET['id'] ?? '';
    if (!is_string($id) || trim($id) === '') {
        acb_send_json(['success' => false, 'error' => 'id обязателен'], 400);
    }

    $stmt = $db->prepare('UPDATE acb_listings SET archived_at = NOW(), status = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND archived_at IS NULL');
    $stmt->execute(['archived', (int)$id, $userId]);

    if ($stmt->rowCount() === 0) {
        acb_send_json(['success' => false, 'error' => 'Объявление не найдено'], 404);
    }

    acb_send_json(['success' => true]);
}
