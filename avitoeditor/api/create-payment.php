<?php
/**
 * API создания платежа через ЮKassa
 * Поддерживает: покупка шаблона + Premium подписка
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';

$paymentConfig = avitoeditor_load_payment_config();

// ЮKassa credentials - только из локального конфига или env.
$YUKASSA_SHOP_ID = ($paymentConfig && isset($paymentConfig['shop_id'])) 
    ? $paymentConfig['shop_id'] 
    : '';

$YUKASSA_SECRET_KEY = ($paymentConfig && isset($paymentConfig['secret_key'])) 
    ? $paymentConfig['secret_key'] 
    : '';

$TEMPLATE_PRICE = ($paymentConfig && isset($paymentConfig['template_price'])) 
    ? $paymentConfig['template_price'] 
    : 700;

$SUBSCRIPTION_MONTHLY = ($paymentConfig && isset($paymentConfig['subscription_monthly'])) 
    ? $paymentConfig['subscription_monthly'] 
    : 700;

$SUBSCRIPTION_YEARLY = ($paymentConfig && isset($paymentConfig['subscription_yearly'])) 
    ? $paymentConfig['subscription_yearly'] 
    : 7000;

// DEV MODE: Auto-approve payments without ЮKassa
$DEV_MODE = ($paymentConfig && isset($paymentConfig['dev_mode'])) 
    ? (bool)$paymentConfig['dev_mode'] 
    : false;

define('YUKASSA_API_URL', 'https://api.yookassa.ru/v3/payments');

try {
    $db = getDB();
    
    // Получить JSON body
    $input = json_decode(file_get_contents('php://input'), true);
    
    $type = $input['type'] ?? 'template'; // 'template' или 'subscription'
    $userEmail = $input['user_email'] ?? null;
    $userName = $input['user_name'] ?? null;
    $returnUrl = $input['return_url'] ?? 'https://xn--80abnjzcaex7a.xn--p1ai/avitoeditor/payment-success.html';
    
    if (!$userEmail) {
        throw new Exception('user_email is required');
    }

    if (!$DEV_MODE && ($YUKASSA_SHOP_ID === '' || $YUKASSA_SECRET_KEY === '')) {
        throw new Exception('Payment configuration is not set');
    }
    
    // Валидация email
    if (!filter_var($userEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    // Определить параметры платежа
    $amount = 0;
    $description = '';
    $metadata = [
        'user_email' => $userEmail,
        'user_name' => $userName,
        'type' => $type
    ];
    
    if ($type === 'template') {
        // Покупка отдельного шаблона
        $templateId = $input['template_id'] ?? null;
        if (!$templateId) {
            throw new Exception('template_id is required for template purchase');
        }
        
        // Получить информацию о шаблоне (если он в БД)
        $template = null;
        $stmt = $db->prepare('SELECT id, title, price, status FROM templates WHERE id = ?');
        $stmt->execute([$templateId]);
        $template = $stmt->fetch();
        
        // Если шаблон не найден в БД, это динамический шаблон - используем переданные данные
        if (!$template) {
            // Динамический шаблон - используем данные из запроса
            $template = [
                'id' => $templateId,
                'title' => $input['template_name'] ?? 'Шаблон ' . $templateId,
                'price' => $input['price'] ?? $TEMPLATE_PRICE,
                'status' => 'paid'
            ];
        }
        
        // Check if template is free (price = 0 or status = 'free')
        if (isset($template['price']) && $template['price'] == 0) {
            throw new Exception('Cannot purchase free template');
        }
        
        if ($template['status'] === 'free') {
            throw new Exception('Cannot purchase free template');
        }
        
        // Проверить не куплен ли уже
        $stmt = $db->prepare('SELECT id FROM purchases WHERE user_email = ? AND template_id = ? AND payment_status = "succeeded"');
        $stmt->execute([$userEmail, $templateId]);
        if ($stmt->fetch()) {
            throw new Exception('Template already purchased');
        }
        
        // Цена: приоритет - из БД шаблона, затем из input, затем из конфига
        $amount = $template['price'] ?? $input['price'] ?? $TEMPLATE_PRICE;
        
        // Валидация цены
        if ($amount <= 0) {
            $amount = $TEMPLATE_PRICE; // Fallback на цену из конфига
        }
        
        $description = 'Покупка Premium шаблона: ' . $template['title'];
        $metadata['template_id'] = $templateId;
        $metadata['template_name'] = $template['title'];
        
    } elseif ($type === 'subscription') {
        // Premium подписка
        $plan = $input['plan'] ?? 'monthly'; // 'monthly' или 'yearly'
        
        if ($plan === 'monthly') {
            $amount = $SUBSCRIPTION_MONTHLY;
            $description = 'Premium подписка на 1 месяц';
        } elseif ($plan === 'yearly') {
            $amount = $SUBSCRIPTION_YEARLY;
            $description = 'Premium подписка на 1 год';
        } else {
            throw new Exception('Invalid subscription plan');
        }
        
        $metadata['plan'] = $plan;
        
    } else {
        throw new Exception('Invalid payment type');
    }
    
    // Создать запись в payment_attempts
    $stmt = $db->prepare('
        INSERT INTO payment_attempts (template_id, user_email, price, payment_type, status)
        VALUES (?, ?, ?, ?, "initiated")
    ');
    $stmt->execute([
        $type === 'template' ? $templateId : null,
        $userEmail,
        $amount,
        $type
    ]);
    
    // Генерировать уникальный idempotency_key
    $idempotencyKey = uniqid('payment_', true);
    
    // Создать платеж в ЮKassa
    $paymentData = [
        'amount' => [
            'value' => number_format($amount, 2, '.', ''),
            'currency' => 'RUB'
        ],
        'confirmation' => [
            'type' => 'redirect',
            'return_url' => $returnUrl
        ],
        'capture' => true,
        'description' => $description,
        'metadata' => $metadata,
        'receipt' => [
            'customer' => [
                'email' => $userEmail
            ],
            'items' => [
                [
                    'description' => $description,
                    'quantity' => '1.00',
                    'amount' => [
                        'value' => number_format($amount, 2, '.', ''),
                        'currency' => 'RUB'
                    ],
                    'vat_code' => 1, // Без НДС
                    'payment_mode' => 'full_payment',
                    'payment_subject' => 'service'
                ]
            ]
        ]
    ];
    
    // DEV MODE: Skip ЮKassa and auto-approve
    if ($DEV_MODE) {
        $paymentId = 'dev_' . uniqid();
        $payment = [
            'id' => $paymentId,
            'status' => 'succeeded',
            'paid' => true,
            'confirmation' => [
                'confirmation_url' => $returnUrl . '?payment_id=' . $paymentId
            ]
        ];
        
        // Сохранить покупку как успешную
        if ($type === 'template') {
            $stmt = $db->prepare('
                INSERT INTO purchases (user_email, user_name, template_id, template_name, price, payment_id, payment_status, amount, currency, paid_at, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, "succeeded", ?, "RUB", NOW(), ?, ?)
            ');
            $stmt->execute([
                $userEmail,
                $userName,
                $templateId ?? null,
                $description,
                $amount,
                $paymentId,
                $amount,
                $_SERVER['REMOTE_ADDR'] ?? 'dev',
                $_SERVER['HTTP_USER_AGENT'] ?? 'dev-test'
            ]);
        } else {
            // Subscription
            $planType = $input['plan'] ?? 'monthly';
            $expiresAt = ($planType === 'yearly') 
                ? date('Y-m-d H:i:s', strtotime('+1 year'))
                : date('Y-m-d H:i:s', strtotime('+1 month'));
            
            $stmt = $db->prepare('
                INSERT INTO subscriptions (user_email, user_name, plan_type, payment_id, status, amount, currency, started_at, expires_at)
                VALUES (?, ?, ?, ?, "active", ?, "RUB", NOW(), ?)
            ');
            $stmt->execute([
                $userEmail,
                $userName,
                $planType,
                $paymentId,
                $amount,
                $expiresAt
            ]);
        }
        
        echo json_encode([
            'success' => true,
            'payment_id' => $paymentId,
            'confirmation_url' => $payment['confirmation']['confirmation_url'],
            'status' => 'succeeded',
            'dev_mode' => true,
            'message' => 'DEV MODE: Payment auto-approved'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Отправить запрос в ЮKassa
    $ch = curl_init(YUKASSA_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Idempotence-Key: ' . $idempotencyKey
        ],
        CURLOPT_USERPWD => $YUKASSA_SHOP_ID . ':' . $YUKASSA_SECRET_KEY,
        CURLOPT_POSTFIELDS => json_encode($paymentData)
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("ЮKassa error: $response");
        throw new Exception('Payment creation failed');
    }
    
    $payment = json_decode($response, true);
    
    // Сохранить платеж в БД
    if ($type === 'template') {
        $stmt = $db->prepare('
            INSERT INTO purchases (user_email, user_name, template_id, template_name, price, payment_id, payment_status, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, "pending", ?, ?)
        ');
        $stmt->execute([
            $userEmail,
            $userName,
            $templateId,
            $metadata['template_name'],
            $amount,
            $payment['id'],
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
    } elseif ($type === 'subscription') {
        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . ($plan === 'yearly' ? '1 year' : '1 month')));
        
        $stmt = $db->prepare('
            INSERT INTO subscriptions (user_email, user_name, plan, price, payment_id, payment_status, starts_at, expires_at)
            VALUES (?, ?, ?, ?, ?, "pending", NOW(), ?)
        ');
        $stmt->execute([
            $userEmail,
            $userName,
            $plan,
            $amount,
            $payment['id'],
            $expiresAt
        ]);
    }
    
    // Обновить payment_attempts
    $stmt = $db->prepare('UPDATE payment_attempts SET status = "redirected" WHERE user_email = ? ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$userEmail]);
    
    // Вернуть URL для редиректа
    echo json_encode([
        'success' => true,
        'payment_id' => $payment['id'],
        'confirmation_url' => $payment['confirmation']['confirmation_url'],
        'amount' => $amount,
        'description' => $description
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
