<?php
/**
 * Webhook для обработки уведомлений от ЮKassa
 * URL: https://site.com/api/payment-webhook.php
 * Настроить в личном кабинете ЮKassa
 */

header('Content-Type: application/json');

require_once __DIR__ . '/config.php';

$paymentConfig = avitoeditor_load_payment_config();

// ЮKassa credentials - только из локального конфига или env.
$YUKASSA_SECRET_KEY = ($paymentConfig && isset($paymentConfig['secret_key'])) 
    ? $paymentConfig['secret_key'] 
    : '';

// Логирование
function logWebhook($message, $data = null) {
    $logFile = __DIR__ . '/../logs/yukassa-webhook.log';
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message";
    if ($data) {
        $logMessage .= "\n" . json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    file_put_contents($logFile, $logMessage . "\n\n", FILE_APPEND);
}

try {
    if ($YUKASSA_SECRET_KEY === '') {
        throw new Exception('Payment webhook secret is not configured');
    }

    // Получить JSON body
    $input = file_get_contents('php://input');
    $notification = json_decode($input, true);
    
    logWebhook('Получено уведомление', $notification);
    
    if (!$notification) {
        throw new Exception('Invalid JSON');
    }
    
    // Проверить тип события
    if ($notification['event'] !== 'payment.succeeded' && $notification['event'] !== 'payment.canceled') {
        // Игнорируем другие события
        echo json_encode(['status' => 'ignored']);
        exit;
    }
    
    $payment = $notification['object'];
    $paymentId = $payment['id'];
    $status = $payment['status']; // 'succeeded' или 'canceled'
    $metadata = $payment['metadata'] ?? [];
    
    $db = getDB();
    
    // Определить тип платежа
    $type = $metadata['type'] ?? 'template';
    
    if ($type === 'template') {
        // Обновить покупку шаблона
        $stmt = $db->prepare('
            UPDATE purchases
            SET payment_status = ?,
                paid_at = NOW(),
                payment_method = ?
            WHERE payment_id = ?
        ');
        $stmt->execute([
            $status,
            $payment['payment_method']['type'] ?? null,
            $paymentId
        ]);
        
        if ($stmt->rowCount() > 0 && $status === 'succeeded') {
            // Увеличить счетчик покупок шаблона
            $templateId = $metadata['template_id'] ?? null;
            if ($templateId) {
                $stmt = $db->prepare('UPDATE templates SET purchases_count = purchases_count + 1 WHERE id = ?');
                $stmt->execute([$templateId]);
            }
            
            logWebhook('Покупка шаблона успешно обработана', [
                'payment_id' => $paymentId,
                'template_id' => $templateId,
                'user_email' => $metadata['user_email']
            ]);
        }
        
    } elseif ($type === 'subscription') {
        // Обновить подписку
        $stmt = $db->prepare('
            UPDATE subscriptions
            SET payment_status = ?,
                status = ?
            WHERE payment_id = ?
        ');
        $newStatus = $status === 'succeeded' ? 'active' : 'canceled';
        $stmt->execute([
            $status,
            $newStatus,
            $paymentId
        ]);
        
        if ($stmt->rowCount() > 0) {
            logWebhook('Подписка успешно обработана', [
                'payment_id' => $paymentId,
                'status' => $newStatus,
                'user_email' => $metadata['user_email']
            ]);
        }
    }
    
    // Обновить payment_attempts
    $stmt = $db->prepare('
        UPDATE payment_attempts
        SET status = ?
        WHERE user_email = ?
        ORDER BY created_at DESC
        LIMIT 1
    ');
    $stmt->execute([
        $status === 'succeeded' ? 'completed' : 'failed',
        $metadata['user_email'] ?? ''
    ]);
    
    // Отправить уведомление пользователю (опционально)
    if ($status === 'succeeded' && isset($metadata['user_email'])) {
        // TODO: Отправить email с подтверждением
        // sendPurchaseConfirmation($metadata['user_email'], $metadata, $type);
    }
    
    echo json_encode(['status' => 'success']);
    
} catch (Exception $e) {
    logWebhook('Ошибка обработки webhook', ['error' => $e->getMessage()]);
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
