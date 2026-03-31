<?php
/**
 * Авторизация админа
 */

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? 'https://инфобаннер.рф'));
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Пароль админа (bill111111) - хешированный через password_hash()
// Для создания нового хеша: password_hash('ваш_пароль', PASSWORD_DEFAULT)
// Хеш для: bill111111
define('ADMIN_PASSWORD_HASH', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

// Rate limiting для защиты от брутфорса
define('LOGIN_ATTEMPTS_FILE', __DIR__ . '/login_attempts.json');
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_TIME', 900); // 15 минут

// GET - проверка статуса
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'is_admin' => isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true
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
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    // Проверка rate limiting
    if (isIpLocked($ip)) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Слишком много попыток входа. Попробуйте через 15 минут'
        ]);
        logFailedAttempt($ip, 'Rate limit exceeded');
        exit;
    }
    
    // Проверка пароля через password_verify
    if (password_verify($password, ADMIN_PASSWORD_HASH)) {
        $_SESSION['is_admin'] = true;
        $_SESSION['admin_logged_in'] = true; // Для совместимости с stats.php
        clearLoginAttempts($ip);
        echo json_encode([
            'success' => true,
            'message' => 'Успешный вход как администратор'
        ]);
    } else {
        recordFailedAttempt($ip);
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Неверный пароль'
        ]);
        logFailedAttempt($ip, 'Invalid password');
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
