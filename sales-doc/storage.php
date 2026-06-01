<?php

function salesdoc_config(): array {
    static $config = null;
    if ($config !== null) return $config;

    $path = dirname(__DIR__) . '/system/config/config.php';
    $config = is_file($path) ? require $path : [];
    return is_array($config) ? $config : [];
}

function salesdoc_table(string $name): string {
    $config = salesdoc_config();
    $prefix = preg_replace('/[^a-zA-Z0-9_]/', '', (string)($config['db_prefix'] ?? 'cms_'));
    return '`' . $prefix . 'salesdoc_' . preg_replace('/[^a-zA-Z0-9_]/', '', $name) . '`';
}

function salesdoc_pdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $config = salesdoc_config();
    $host = (string)($config['db_host'] ?? 'localhost');
    $base = (string)($config['db_base'] ?? '');
    $user = (string)($config['db_user'] ?? '');
    $pass = (string)($config['db_pass'] ?? '');

    if ($base === '' || $user === '') {
        throw new RuntimeException('Database config is incomplete');
    }

    $pdo = new PDO('mysql:host=' . $host . ';dbname=' . $base . ';charset=utf8mb4', $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function salesdoc_ensure_schema(): void {
    static $done = false;
    if ($done) return;

    $pdo = salesdoc_pdo();
    $docs = salesdoc_table('documents');
    $assets = salesdoc_table('assets');

    $pdo->exec("CREATE TABLE IF NOT EXISTS {$docs} (
        `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        `slug` VARCHAR(16) NOT NULL,
        `status` VARCHAR(20) NOT NULL DEFAULT 'published',
        `doc_version` TINYINT UNSIGNED NOT NULL DEFAULT 3,
        `name` VARCHAR(160) NOT NULL DEFAULT '',
        `title` VARCHAR(220) NOT NULL DEFAULT '',
        `description` VARCHAR(255) NOT NULL DEFAULT '',
        `meta_json` MEDIUMTEXT NOT NULL,
        `blocks_json` MEDIUMTEXT NOT NULL,
        `body_html` MEDIUMTEXT NOT NULL,
        `created_at` DATETIME NOT NULL,
        `updated_at` DATETIME NOT NULL,
        `published_at` DATETIME NOT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `slug` (`slug`),
        KEY `status_created` (`status`, `created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS {$assets} (
        `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        `asset_key` VARCHAR(32) NOT NULL,
        `doc_slug` VARCHAR(16) DEFAULT NULL,
        `kind` VARCHAR(40) NOT NULL DEFAULT 'image',
        `original_name` VARCHAR(255) NOT NULL DEFAULT '',
        `mime` VARCHAR(80) NOT NULL DEFAULT '',
        `file_path` VARCHAR(255) NOT NULL,
        `public_url` VARCHAR(255) NOT NULL,
        `width` INT UNSIGNED NOT NULL DEFAULT 0,
        `height` INT UNSIGNED NOT NULL DEFAULT 0,
        `size_bytes` INT UNSIGNED NOT NULL DEFAULT 0,
        `created_at` DATETIME NOT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `asset_key` (`asset_key`),
        KEY `doc_slug` (`doc_slug`),
        KEY `created_at` (`created_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $done = true;
}

function salesdoc_slug_exists(string $slug): bool {
    salesdoc_ensure_schema();
    $stmt = salesdoc_pdo()->prepare('SELECT 1 FROM ' . salesdoc_table('documents') . ' WHERE slug = ? LIMIT 1');
    $stmt->execute([$slug]);
    if ($stmt->fetchColumn()) return true;
    return is_file(__DIR__ . '/data/' . $slug . '.json');
}

function salesdoc_generate_slug(int $length = 12): string {
    $chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    do {
        $slug = '';
        for ($i = 0; $i < $length; $i++) {
            $slug .= $chars[random_int(0, strlen($chars) - 1)];
        }
    } while (salesdoc_slug_exists($slug));
    return $slug;
}

function salesdoc_save_document(string $slug, array $doc): void {
    salesdoc_ensure_schema();
    $now = date('Y-m-d H:i:s');
    $meta = is_array($doc['meta'] ?? null) ? $doc['meta'] : [];
    $stmt = salesdoc_pdo()->prepare('INSERT INTO ' . salesdoc_table('documents') . ' 
        (slug, status, doc_version, name, title, description, meta_json, blocks_json, body_html, created_at, updated_at, published_at)
        VALUES (:slug, :status, :doc_version, :name, :title, :description, :meta_json, :blocks_json, :body_html, :created_at, :updated_at, :published_at)');
    $stmt->execute([
        ':slug' => $slug,
        ':status' => 'published',
        ':doc_version' => (int)($doc['v'] ?? 3),
        ':name' => (string)($meta['name'] ?? ''),
        ':title' => (string)($meta['title'] ?? ''),
        ':description' => (string)($meta['description'] ?? ''),
        ':meta_json' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':blocks_json' => json_encode($doc['blocks'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':body_html' => (string)($doc['body_html'] ?? ''),
        ':created_at' => (string)($doc['created_at'] ?? $now),
        ':updated_at' => $now,
        ':published_at' => $now,
    ]);
}

function salesdoc_load_document(string $slug): ?array {
    try {
        salesdoc_ensure_schema();
        $stmt = salesdoc_pdo()->prepare('SELECT * FROM ' . salesdoc_table('documents') . ' WHERE slug = ? AND status = ? LIMIT 1');
        $stmt->execute([$slug, 'published']);
        $row = $stmt->fetch();
        if (!$row) return null;
        $meta = json_decode((string)$row['meta_json'], true);
        $blocks = json_decode((string)$row['blocks_json'], true);
        return [
            'v' => (int)$row['doc_version'],
            'meta' => is_array($meta) ? $meta : [],
            'blocks' => is_array($blocks) ? $blocks : [],
            'body_html' => (string)$row['body_html'],
            'created_at' => (string)$row['created_at'],
            'updated_at' => (string)$row['updated_at'],
            'storage' => 'db',
        ];
    } catch (Throwable $e) {
        return null;
    }
}

function salesdoc_save_asset(array $asset): void {
    salesdoc_ensure_schema();
    $stmt = salesdoc_pdo()->prepare('INSERT INTO ' . salesdoc_table('assets') . ' 
        (asset_key, doc_slug, kind, original_name, mime, file_path, public_url, width, height, size_bytes, created_at)
        VALUES (:asset_key, :doc_slug, :kind, :original_name, :mime, :file_path, :public_url, :width, :height, :size_bytes, :created_at)');
    $stmt->execute([
        ':asset_key' => (string)$asset['asset_key'],
        ':doc_slug' => $asset['doc_slug'] ?? null,
        ':kind' => (string)($asset['kind'] ?? 'image'),
        ':original_name' => (string)($asset['original_name'] ?? ''),
        ':mime' => (string)($asset['mime'] ?? ''),
        ':file_path' => (string)$asset['file_path'],
        ':public_url' => (string)$asset['public_url'],
        ':width' => (int)($asset['width'] ?? 0),
        ':height' => (int)($asset['height'] ?? 0),
        ':size_bytes' => (int)($asset['size_bytes'] ?? 0),
        ':created_at' => date('Y-m-d H:i:s'),
    ]);
}
