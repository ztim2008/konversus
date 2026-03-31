<?php
/**
 * Конфигурация подключения к MySQL
 * Для Beget хостинга
 */

// Данные для подключения к MySQL
// ВАЖНО: В production замените пароль и перенесите в защищённый config
define('DB_HOST', 'localhost');
define('DB_NAME', 'redactor');
define('DB_USER', 'redactor');
// Пароль: для безопасности рекомендуется вынести в отдельный файл вне web root
// Но для работоспособности оставляем здесь с предупреждением
define('DB_PASS', 'nK7lA9gC1t'); // ⚠️ TODO: Вынести в защищённое место
define('DB_CHARSET', 'utf8mb4');

// Пути для загрузки файлов
define('UPLOAD_DIR', dirname(__DIR__) . '/uploads/templates/');
define('THUMBNAIL_DIR', UPLOAD_DIR . 'thumbnails/');
define('PREVIEW_DIR', UPLOAD_DIR . 'previews/');

// URL для доступа к загруженным файлам
define('UPLOAD_URL', '/avitoeditor/uploads/templates/');
define('THUMBNAIL_URL', UPLOAD_URL . 'thumbnails/');
define('PREVIEW_URL', UPLOAD_URL . 'previews/');

// Максимальный размер файла (5MB)
define('MAX_FILE_SIZE', 5 * 1024 * 1024);

// Разрешённые типы изображений
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/**
 * Получить PDO подключение к базе данных
 */
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    
    return $pdo;
}

/**
 * Создать директории для загрузки если их нет
 */
function ensureUploadDirs() {
    if (!file_exists(THUMBNAIL_DIR)) {
        mkdir(THUMBNAIL_DIR, 0755, true);
    }
    if (!file_exists(PREVIEW_DIR)) {
        mkdir(PREVIEW_DIR, 0755, true);
    }
}
