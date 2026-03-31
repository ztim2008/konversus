<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
require_once __DIR__ . '/jwt.php';
acb_cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    acb_send_json(['success' => false, 'error' => 'Method not allowed'], 405);
}

$input = acb_read_json_body();
$refreshToken = $input['refresh_token'] ?? '';
if (!is_string($refreshToken) || $refreshToken === '') {
    acb_send_json(['success' => false, 'error' => 'refresh_token обязателен'], 400);
}

$db = acb_db();
$hash = hash('sha256', $refreshToken);

$stmt = $db->prepare('SELECT id, user_id, expires_at, revoked_at FROM acb_refresh_tokens WHERE token_hash = ? ORDER BY id DESC LIMIT 1');
$stmt->execute([$hash]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!is_array($row)) {
    acb_send_json(['success' => false, 'error' => 'Неверный refresh_token'], 401);
}

if (!empty($row['revoked_at'])) {
    acb_send_json(['success' => false, 'error' => 'refresh_token отозван'], 401);
}

$expiresAt = strtotime((string)$row['expires_at']);
if ($expiresAt !== false && time() >= $expiresAt) {
    acb_send_json(['success' => false, 'error' => 'refresh_token истек'], 401);
}

$jwtSecret = acb_env('ACB_JWT_SECRET');
$accessTtl = (int)(getenv('ACB_JWT_ACCESS_TTL_SECONDS') ?: 900);
if ($accessTtl <= 0) {
    $accessTtl = 900;
}

$now = time();
$accessPayload = [
    'sub' => (string)$row['user_id'],
    'typ' => 'access',
    'iat' => $now,
    'exp' => $now + $accessTtl,
];
$accessJwt = acb_jwt_encode($accessPayload, $jwtSecret);

acb_send_json([
    'success' => true,
    'access_token' => $accessJwt,
    'access_expires_in' => $accessTtl,
]);
