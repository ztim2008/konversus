<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/storage.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

if (empty($_FILES['image']) || !is_array($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Image file required']);
    exit;
}

$file = $_FILES['image'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Upload failed']);
    exit;
}

if ((int)($file['size'] ?? 0) > 8 * 1024 * 1024) {
    http_response_code(413);
    echo json_encode(['error' => 'Image is too large']);
    exit;
}

$tmp = (string)$file['tmp_name'];
$info = @getimagesize($tmp);
if (!$info || empty($info['mime'])) {
    http_response_code(422);
    echo json_encode(['error' => 'Unsupported image']);
    exit;
}

$mime = (string)$info['mime'];
$create = null;
if ($mime === 'image/jpeg') $create = 'imagecreatefromjpeg';
if ($mime === 'image/png') $create = 'imagecreatefrompng';
if ($mime === 'image/webp' && function_exists('imagecreatefromwebp')) $create = 'imagecreatefromwebp';

if (!$create || !function_exists($create)) {
    http_response_code(422);
    echo json_encode(['error' => 'Only JPG, PNG and WebP are supported']);
    exit;
}

$src = @$create($tmp);
if (!$src) {
    http_response_code(422);
    echo json_encode(['error' => 'Cannot read image']);
    exit;
}

$srcW = imagesx($src);
$srcH = imagesy($src);
$max = max(200, min(2400, (int)($_POST['max_px'] ?? 1800)));
$scale = min(1, $max / max($srcW, $srcH));
$dstW = max(1, (int)round($srcW * $scale));
$dstH = max(1, (int)round($srcH * $scale));

$dst = imagecreatetruecolor($dstW, $dstH);
$white = imagecolorallocate($dst, 255, 255, 255);
imagefill($dst, 0, 0, $white);
imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
imagedestroy($src);

$assetKey = bin2hex(random_bytes(12));
$relDir = '/sales-doc/uploads/' . date('Y') . '/' . date('m');
$absDir = __DIR__ . '/uploads/' . date('Y') . '/' . date('m');
if (!is_dir($absDir) && !mkdir($absDir, 0775, true)) {
    imagedestroy($dst);
    http_response_code(500);
    echo json_encode(['error' => 'Cannot create upload directory']);
    exit;
}

$relPath = $relDir . '/' . $assetKey . '.jpg';
$absPath = __DIR__ . '/uploads/' . date('Y') . '/' . date('m') . '/' . $assetKey . '.jpg';
if (!imagejpeg($dst, $absPath, 92)) {
    imagedestroy($dst);
    http_response_code(500);
    echo json_encode(['error' => 'Cannot save image']);
    exit;
}
imagedestroy($dst);

@chmod($absPath, 0664);

try {
    salesdoc_save_asset([
        'asset_key' => $assetKey,
        'doc_slug' => null,
        'kind' => (string)($_POST['kind'] ?? 'image'),
        'original_name' => basename((string)($file['name'] ?? 'image')),
        'mime' => 'image/jpeg',
        'file_path' => $relPath,
        'public_url' => $relPath,
        'width' => $dstW,
        'height' => $dstH,
        'size_bytes' => filesize($absPath) ?: 0,
    ]);
} catch (Throwable $e) {
    error_log('SalesDoc asset DB save failed: ' . $e->getMessage());
}

echo json_encode([
    'ok' => true,
    'assetKey' => $assetKey,
    'url' => $relPath,
    'width' => $dstW,
    'height' => $dstH,
    'size' => filesize($absPath) ?: 0,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
