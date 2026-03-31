<?php
/**
 * API для загрузки изображений шаблонов
 * Принимает base64 изображения и сохраняет как файлы
 */

header('Content-Type: application/json; charset=utf-8');

// CORS: только разрешённые домены
$allowedOrigins = [
    'https://инфобаннер.рф',
    'https://xn--80abnjzcaex7a.xn--p1ai',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
} elseif (empty($origin)) {
    // Разрешаем прямые запросы с того же домена
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON');
    }
    
    if (!isset($input['thumbnail']) || !isset($input['preview']) || !isset($input['id'])) {
        throw new Exception('Missing required fields: thumbnail, preview, id');
    }
    
    ensureUploadDirs();
    
    // Сохранить thumbnail
    $thumbnailPath = saveBase64Image($input['thumbnail'], THUMBNAIL_DIR, $input['id'] . '_thumb');
    
    // Сохранить preview
    $previewPath = saveBase64Image($input['preview'], PREVIEW_DIR, $input['id'] . '_preview');
    
    echo json_encode([
        'success' => true,
        'thumbnail' => THUMBNAIL_URL . basename($thumbnailPath),
        'preview' => PREVIEW_URL . basename($previewPath)
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Сохранить base64 изображение как файл
 */
function saveBase64Image($base64Data, $directory, $filename) {
    // Проверить формат base64
    if (!preg_match('/^data:image\/(png|jpeg|jpg|gif|webp);base64,/', $base64Data, $matches)) {
        throw new Exception('Invalid image format');
    }
    
    $imageType = $matches[1];
    if ($imageType === 'jpeg') $imageType = 'jpg';
    
    // Проверить допустимый тип
    $mimeType = 'image/' . ($imageType === 'jpg' ? 'jpeg' : $imageType);
    if (!in_array($mimeType, ALLOWED_TYPES)) {
        throw new Exception('Image type not allowed: ' . $imageType);
    }
    
    // Убрать префикс data:image/...;base64,
    $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $base64Data);
    
    // Декодировать
    $imageData = base64_decode($base64Data, true);
    
    if ($imageData === false) {
        throw new Exception('Failed to decode base64 image');
    }
    
    // КРИТИЧНО: Проверить реальный MIME type (защита от загрузки PHP/HTML/SVG)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detectedMime = $finfo->buffer($imageData);
    
    if (!in_array($detectedMime, ALLOWED_TYPES)) {
        throw new Exception('Invalid file type detected: ' . $detectedMime . ' (expected: ' . $mimeType . ')');
    }
    
    // Дополнительная проверка: убедиться что это валидное изображение
    $imageInfo = @getimagesizefromstring($imageData);
    if ($imageInfo === false) {
        throw new Exception('Not a valid image file');
    }
    
    // Проверить размер
    $size = strlen($imageData);
    if ($size > MAX_FILE_SIZE) {
        throw new Exception('Image size exceeds limit: ' . round($size / 1024 / 1024, 2) . 'MB');
    }
    
    // Генерировать уникальное имя файла
    $filename = $filename . '_' . time() . '.' . $imageType;
    $filepath = $directory . $filename;
    
    // Сохранить файл
    if (file_put_contents($filepath, $imageData) === false) {
        throw new Exception('Failed to save image file');
    }
    
    // Установить права доступа
    chmod($filepath, 0644);
    
    return $filepath;
}
