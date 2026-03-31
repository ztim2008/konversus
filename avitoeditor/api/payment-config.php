<?php
/**
 * Payment Configuration API
 * Управление настройками ЮКассы
 */

session_start();

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// Check admin auth
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Доступ запрещен']);
    exit;
}

$configFile = avitoeditor_payment_config_path();

// GET - Read config
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($configFile)) {
        $config = json_decode(file_get_contents($configFile), true);
        echo json_encode([
            'success' => true,
            'data' => $config
        ]);
    } else {
        // Default config
        echo json_encode([
            'success' => true,
            'data' => [
                'shop_id' => '',
                'secret_key' => '',
                'test_mode' => false,
                'dev_mode' => false,
                'template_price' => 700,
                'subscription_monthly' => 700,
                'subscription_yearly' => 7000
            ]
        ]);
    }
    exit;
}

// POST - Save config
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validation
    if (empty($input['shop_id']) || empty($input['secret_key'])) {
        echo json_encode([
            'success' => false,
            'error' => 'Shop ID и Secret Key обязательны'
        ]);
        exit;
    }
    
    // Prepare config
    $config = [
        'shop_id' => trim($input['shop_id']),
        'secret_key' => trim($input['secret_key']),
        'test_mode' => isset($input['test_mode']) ? (bool)$input['test_mode'] : false,
        'dev_mode' => isset($input['dev_mode']) ? (bool)$input['dev_mode'] : false,
        'template_price' => isset($input['template_price']) ? (int)$input['template_price'] : 700,
        'subscription_monthly' => isset($input['subscription_monthly']) ? (int)$input['subscription_monthly'] : 700,
        'subscription_yearly' => isset($input['subscription_yearly']) ? (int)$input['subscription_yearly'] : 7000,
        'updated_at' => date('Y-m-d H:i:s')
    ];
    
    // Create config directory if not exists
    $configDir = dirname($configFile);
    if (!is_dir($configDir)) {
        if (!mkdir($configDir, 0755, true)) {
            echo json_encode([
                'success' => false,
                'error' => 'Не удалось создать директорию config. Проверьте права доступа.'
            ]);
            exit;
        }
    }
    
    // Save config
    $jsonData = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $result = file_put_contents($configFile, $jsonData);
    
    if ($result !== false) {
        echo json_encode([
            'success' => true,
            'message' => 'Настройки сохранены',
            'file' => $configFile,
            'bytes' => $result
        ]);
    } else {
        $error = error_get_last();
        echo json_encode([
            'success' => false,
            'error' => 'Ошибка сохранения файла: ' . ($error ? $error['message'] : 'Неизвестная ошибка'),
            'path' => $configFile,
            'dir_writable' => is_writable($configDir),
            'dir_exists' => is_dir($configDir)
        ]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Метод не поддерживается']);
