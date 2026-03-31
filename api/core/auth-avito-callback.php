<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
acb_cors();

$oauthError = $_GET['error'] ?? null;
if (is_string($oauthError) && $oauthError !== '') {
    acb_send_json([
        'success' => false,
        'error' => 'Ошибка OAuth от Avito: ' . $oauthError,
        'description' => (is_string($_GET['error_description'] ?? null) ? (string)$_GET['error_description'] : null),
    ], 400);
}

$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';

if (!is_string($code) || trim($code) === '' || !is_string($state) || trim($state) === '') {
    acb_send_json([
        'success' => false,
        'error' => 'Не хватает параметров OAuth от Avito (code/state)',
        'next_step' => 'Настроить start endpoint, обмен code на token и сохранение Avito connection в Data Hub.',
    ], 400);
}

$stateCookie = acb_cookie_get('acb_avito_oauth_state');
if ($stateCookie !== null && !hash_equals($stateCookie, $state)) {
    acb_send_json([
        'success' => false,
        'error' => 'Некорректный state Avito OAuth',
    ], 400);
}

if ($stateCookie !== null) {
    acb_cookie_clear('acb_avito_oauth_state');
}

acb_send_json([
    'success' => true,
    'message' => 'Callback URL Avito OAuth зарегистрирован и доступен. Следующий шаг — подключить exchange code -> token и сохранение подключения в Data Hub.',
    'received' => [
        'code' => '[получен]',
        'state' => '[получен]',
    ],
]);