<?php
/**
 * Payment Connection Test API
 * Проверка подключения к ЮКассе
 */

session_start();

header('Content-Type: application/json; charset=utf-8');

// Check admin auth
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Доступ запрещен']);
    exit;
}

require_once __DIR__ . '/config.php';

$configFile = avitoeditor_payment_config_path();

$config = avitoeditor_load_payment_config();

if (empty($config['shop_id']) || empty($config['secret_key'])) {
    echo json_encode([
        'success' => false,
        'error' => 'Настройки оплаты не сохранены. Сначала сохраните Shop ID и Secret Key.'
    ]);
    exit;
}

// Validate secret key format
$keyPrefix = substr($config['secret_key'], 0, 5);
if ($keyPrefix !== 'live_' && $keyPrefix !== 'test_') {
    echo json_encode([
        'success' => false,
        'error' => 'Неверный формат Secret Key. Должен начинаться с live_ или test_'
    ]);
    exit;
}

// All checks passed
echo json_encode([
    'success' => true,
    'shop_id' => $config['shop_id'],
    'test_mode' => !empty($config['test_mode']),
    'message' => 'Конфигурация корректна. Для полной проверки совершите тестовый платёж.'
]);
