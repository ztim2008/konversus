<?php
/**
 * SalesDoc — публичный счётчик профилей для виджета на главной.
 * Возвращает: {"docs": N}
 * Кешируется на 10 минут файловым кешем.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=600');
header('Access-Control-Allow-Origin: *');

$cache_file = __DIR__ . '/data/_stats_cache.json';
$cache_ttl  = 600; // 10 минут

if (is_file($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    echo file_get_contents($cache_file);
    exit;
}

require_once __DIR__ . '/storage.php';

try {
    $pdo  = salesdoc_pdo();
    $tbl  = salesdoc_table('documents');
    $docs = (int) $pdo->query("SELECT COUNT(*) FROM $tbl WHERE status = 'published'")->fetchColumn();

    $result = json_encode(['docs' => $docs]);
    @file_put_contents($cache_file, $result, LOCK_EX);
    echo $result;
} catch (Throwable $e) {
    // При ошибке возвращаем закешированное, если есть
    if (is_file($cache_file)) {
        echo file_get_contents($cache_file);
    } else {
        echo json_encode(['docs' => 0]);
    }
}
