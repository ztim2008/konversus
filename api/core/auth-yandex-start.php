<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
acb_cors();

$clientId = acb_env('ACB_YANDEX_CLIENT_ID');
$redirectUri = acb_env('ACB_YANDEX_REDIRECT_URI');

$state = bin2hex(random_bytes(16));
acb_cookie_set('acb_yandex_oauth_state', $state, 10 * 60);

$params = [
    'response_type' => 'code',
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'state' => $state,
];

$scope = getenv('ACB_YANDEX_SCOPE');
if (is_string($scope) && trim($scope) !== '') {
    $params['scope'] = trim($scope);
}

$authUrl = 'https://oauth.yandex.ru/authorize?' . http_build_query($params);

acb_send_json([
    'success' => true,
    'authorize_url' => $authUrl,
]);
