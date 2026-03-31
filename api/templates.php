<?php
/**
 * API для работы с шаблонами
 * Использует MySQL для хранения метаданных и файловую систему для изображений
 */

session_start(); // Для проверки авторизации

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Проверка авторизации для изменяющих операций
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
    if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Admin access required',
            'message' => 'Только администратор может создавать, редактировать или удалять шаблоны'
        ]);
        exit;
    }
}

try {
    switch ($method) {
        case 'GET':
            handleGet($db);
            break;
        case 'POST':
            handlePost($db);
            break;
        case 'PUT':
            handlePut($db);
            break;
        case 'DELETE':
            handleDelete($db);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * GET - Получить все шаблоны или один по ID
 */
function handleGet($db) {
    if (isset($_GET['id'])) {
        // Получить один шаблон
        $stmt = $db->prepare('SELECT * FROM templates WHERE id = ?');
        $stmt->execute([$_GET['id']]);
        $template = $stmt->fetch();
        
        if ($template) {
            $template['tags'] = json_decode($template['tags'], true);
            $template['canvasData'] = json_decode($template['canvas_data'], true);
            unset($template['canvas_data']);
            echo json_encode($template);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Template not found']);
        }
    } else {
        // Получить все шаблоны
        $category = $_GET['category'] ?? null;
        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;
        
        $sql = 'SELECT * FROM templates WHERE 1=1';
        $params = [];
        
        if ($category) {
            $sql .= ' AND category = ?';
            $params[] = $category;
        }
        
        if ($status) {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        
        if ($search) {
            $sql .= ' AND (title LIKE ? OR description LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        $sql .= ' ORDER BY created_at DESC';
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $templates = $stmt->fetchAll();
        
        // Декодировать JSON поля
        foreach ($templates as &$template) {
            $template['tags'] = json_decode($template['tags'], true);
            // Не возвращаем canvasData в списке (слишком большой)
            unset($template['canvas_data']);
        }
        
        echo json_encode($templates);
    }
}

/**
 * POST - Создать или обновить шаблон
 */
function handlePost($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        return;
    }
    
    // Валидация обязательных полей
    $required = ['id', 'title', 'category', 'thumbnail', 'preview', 'canvasData'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }
    
    // Проверить существует ли шаблон
    $stmt = $db->prepare('SELECT id FROM templates WHERE id = ?');
    $stmt->execute([$input['id']]);
    $exists = $stmt->fetch();
    
    if ($exists) {
        // UPDATE
        $sql = 'UPDATE templates SET 
                title = ?, 
                description = ?, 
                category = ?, 
                status = ?, 
                price = ?, 
                badge = ?,
                thumbnail = ?, 
                preview = ?, 
                canvas_data = ?, 
                tags = ?
                WHERE id = ?';
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $input['title'],
            $input['description'] ?? '',
            $input['category'],
            $input['status'] ?? 'free',
            $input['price'] ?? 0,
            $input['badge'] ?? null,
            $input['thumbnail'],
            $input['preview'],
            json_encode($input['canvasData']),
            json_encode($input['tags'] ?? []),
            $input['id']
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Template updated', 'id' => $input['id']]);
    } else {
        // INSERT
        $sql = 'INSERT INTO templates 
                (id, title, description, category, status, price, badge, thumbnail, preview, canvas_data, tags) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            $input['id'],
            $input['title'],
            $input['description'] ?? '',
            $input['category'],
            $input['status'] ?? 'free',
            $input['price'] ?? 0,
            $input['badge'] ?? null,
            $input['thumbnail'],
            $input['preview'],
            json_encode($input['canvasData']),
            json_encode($input['tags'] ?? [])
        ]);
        
        echo json_encode(['success' => true, 'message' => 'Template created', 'id' => $input['id']]);
    }
}

/**
 * PUT - Обновить шаблон (например, canvas_data после конвертации base64 → файлы)
 */
function handlePut($db) {
    // Проверка авторизации
    if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing template id']);
        return;
    }
    
    // Проверяем существование шаблона
    $stmt = $db->prepare('SELECT id FROM templates WHERE id = ?');
    $stmt->execute([$input['id']]);
    
    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Template not found']);
        return;
    }
    
    // Обновляем только canvas_data
    if (isset($input['canvas_data'])) {
        $canvasDataJson = is_string($input['canvas_data']) 
            ? $input['canvas_data'] 
            : json_encode($input['canvas_data']);
            
        $stmt = $db->prepare('UPDATE templates SET canvas_data = ? WHERE id = ?');
        $stmt->execute([$canvasDataJson, $input['id']]);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Template canvas_data updated',
            'size' => strlen($canvasDataJson)
        ]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'No canvas_data provided']);
    }
}

/**
 * DELETE - Удалить шаблон
 */
function handleDelete($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing template id']);
        return;
    }
    
    // Получить пути к файлам перед удалением
    $stmt = $db->prepare('SELECT thumbnail, preview FROM templates WHERE id = ?');
    $stmt->execute([$input['id']]);
    $template = $stmt->fetch();
    
    if ($template) {
        // Удалить файлы
        $thumbnailPath = dirname(__DIR__) . $template['thumbnail'];
        $previewPath = dirname(__DIR__) . $template['preview'];
        
        if (file_exists($thumbnailPath)) {
            unlink($thumbnailPath);
        }
        if (file_exists($previewPath)) {
            unlink($previewPath);
        }
        
        // Удалить из БД
        $stmt = $db->prepare('DELETE FROM templates WHERE id = ?');
        $stmt->execute([$input['id']]);
        
        echo json_encode(['success' => true, 'message' => 'Template deleted']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Template not found']);
    }
}
