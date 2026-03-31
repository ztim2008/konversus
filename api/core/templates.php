<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
acb_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    acb_send_json(['success' => false, 'error' => 'Method not allowed'], 405);
}

$db = acb_db();

try {
    $id = $_GET['id'] ?? null;

    if (is_string($id) && trim($id) !== '') {
        $stmt = $db->prepare('SELECT id, title, description, category, status, price, badge, thumbnail, preview, tags, created_at, updated_at FROM templates WHERE id = ? LIMIT 1');
        $stmt->execute([trim($id)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            acb_send_json(['success' => false, 'error' => 'Шаблон не найден'], 404);
        }

        $row['tags'] = acb_decode_json_array($row['tags'] ?? null);
        acb_send_json(['success' => true, 'template' => $row]);
    }

    $category = $_GET['category'] ?? null;
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? null;

    $sql = 'SELECT id, title, description, category, status, price, badge, thumbnail, preview, tags, created_at, updated_at FROM templates WHERE 1=1';
    $params = [];

    if (is_string($category) && trim($category) !== '') {
        $sql .= ' AND category = ?';
        $params[] = trim($category);
    }

    if (is_string($status) && trim($status) !== '') {
        $sql .= ' AND status = ?';
        $params[] = trim($status);
    }

    if (is_string($search) && trim($search) !== '') {
        $sql .= ' AND (title LIKE ? OR description LIKE ?)';
        $q = '%' . trim($search) . '%';
        $params[] = $q;
        $params[] = $q;
    }

    $sql .= ' ORDER BY created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        if (!is_array($r)) {
            continue;
        }
        $r['tags'] = acb_decode_json_array($r['tags'] ?? null);
    }

    acb_send_json(['success' => true, 'templates' => $rows]);
} catch (Throwable $e) {
    acb_send_json(['success' => false, 'error' => 'Ошибка сервера'], 500);
}

function acb_decode_json_array($value): array {
    if (!is_string($value) || trim($value) === '') {
        return [];
    }
    $decoded = json_decode($value, true);
    if (!is_array($decoded)) {
        return [];
    }
    return $decoded;
}
