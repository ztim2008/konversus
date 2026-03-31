<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    if (!headers_sent()) {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
    }
    echo "403 Forbidden\n";
    exit;
}

$argv = $_SERVER['argv'] ?? [];
$path = $argv[1] ?? '';

if (!is_string($path) || trim($path) === '') {
    fwrite(STDERR, "Использование: php scripts/apply-sql-cli.php path/to/file.sql\n");
    exit(1);
}

$root = dirname(__DIR__);
$fullPath = $path;
if (!str_starts_with($fullPath, '/')) {
    $fullPath = $root . '/' . $path;
}

if (!file_exists($fullPath)) {
    fwrite(STDERR, "SQL файл не найден: {$fullPath}\n");
    exit(1);
}

require_once $root . '/api/config.php';

$db = getDB();
$sql = file_get_contents($fullPath);
if (!is_string($sql)) {
    fwrite(STDERR, "Не удалось прочитать SQL файл\n");
    exit(1);
}

$statements = parse_sql_statements($sql);
if (count($statements) === 0) {
    fwrite(STDERR, "В SQL файле нет выполняемых выражений\n");
    exit(1);
}

try {
    $count = 0;
    foreach ($statements as $stmtSql) {
        $db->exec($stmtSql);
        $count++;
    }
    fwrite(STDOUT, "OK: выполнено выражений: {$count}\n");
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, "Ошибка применения SQL: {$e->getMessage()}\n");
    exit(1);
}

function parse_sql_statements(string $sql): array {
    $lines = preg_split('/\R/u', $sql) ?: [];

    $out = [];
    $buf = '';

    foreach ($lines as $line) {
        $trim = ltrim($line);
        if ($trim === '') {
            continue;
        }

        // однострочные комментарии
        if (str_starts_with($trim, '--') || str_starts_with($trim, '#')) {
            continue;
        }

        $buf .= $line . "\n";
        if (str_contains($line, ';')) {
            $parts = explode(';', $buf);
            $last = array_pop($parts);
            foreach ($parts as $p) {
                $stmt = trim($p);
                if ($stmt !== '') {
                    $out[] = $stmt;
                }
            }
            $buf = $last;
        }
    }

    $tail = trim($buf);
    if ($tail !== '') {
        $out[] = $tail;
    }

    return $out;
}
