<?php
/**
 * Авторизация админа
 */

session_start();

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'https://инфобаннер.рф'));
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$adminPasswordHash = avitoeditor_admin_password_hash();

// GET - проверка статуса
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'is_admin' => isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true,
        'auth_configured' => $adminPasswordHash !== ''
    ]);
    exit;
}

// POST - вход
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['password'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Password required'
        ]);
        exit;
    }
    
    $password = $input['password'];

    if ($adminPasswordHash === '') {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Admin auth is not configured'
        ]);
        exit;
    }
    
    if (password_verify($password, $adminPasswordHash)) {
        session_regenerate_id(true);
        $_SESSION['is_admin'] = true;
        echo json_encode([
            'success' => true,
            'message' => 'Успешный вход как администратор'
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Неверный пароль'
        ]);
    }
    exit;
}

// DELETE - выход
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    unset($_SESSION['is_admin']);
    session_destroy();
    echo json_encode([
        'success' => true,
        'message' => 'Вы вышли из системы'
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
