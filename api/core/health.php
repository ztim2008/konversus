<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
acb_cors();

acb_send_json([
    'ok' => true,
    'service' => 'acb-core-api',
    'time' => date('c'),
]);
