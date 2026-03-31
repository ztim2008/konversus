<?php
declare(strict_types=1);

function acb_b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function acb_b64url_decode(string $data): string {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    $decoded = base64_decode(strtr($data, '-_', '+/'), true);
    if ($decoded === false) {
        throw new RuntimeException('Некорректная base64url-строка');
    }
    return $decoded;
}

function acb_jwt_encode(array $payload, string $secret): string {
    $header = ['typ' => 'JWT', 'alg' => 'HS256'];

    $headerPart = acb_b64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES));
    $payloadPart = acb_b64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

    $signingInput = $headerPart . '.' . $payloadPart;
    $signature = hash_hmac('sha256', $signingInput, $secret, true);
    $signaturePart = acb_b64url_encode($signature);

    return $signingInput . '.' . $signaturePart;
}

function acb_jwt_decode(string $token, string $secret): array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        throw new RuntimeException('Некорректный формат JWT');
    }

    [$headerPart, $payloadPart, $signaturePart] = $parts;

    $headerJson = acb_b64url_decode($headerPart);
    $header = json_decode($headerJson, true);
    if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') {
        throw new RuntimeException('Неподдерживаемый алгоритм JWT');
    }

    $signingInput = $headerPart . '.' . $payloadPart;
    $expected = hash_hmac('sha256', $signingInput, $secret, true);
    $provided = acb_b64url_decode($signaturePart);
    if (!hash_equals($expected, $provided)) {
        throw new RuntimeException('Неверная подпись JWT');
    }

    $payloadJson = acb_b64url_decode($payloadPart);
    $payload = json_decode($payloadJson, true);
    if (!is_array($payload)) {
        throw new RuntimeException('Некорректный payload JWT');
    }

    $now = time();
    if (isset($payload['nbf']) && is_numeric($payload['nbf']) && $now < (int)$payload['nbf']) {
        throw new RuntimeException('JWT еще не активен (nbf)');
    }
    if (isset($payload['exp']) && is_numeric($payload['exp']) && $now >= (int)$payload['exp']) {
        throw new RuntimeException('JWT истек (exp)');
    }

    return $payload;
}
