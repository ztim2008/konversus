<?php
/**
 * Analytics Dashboard
 * Простая страница для просмотра статистики
 * Доступ: только для админа
 */

session_start();

// Проверка авторизации через admin.html
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    die('<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #11111b;
            color: #cdd6f4;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            max-width: 500px;
            padding: 40px;
        }
        h1 {
            color: #f38ba8;
            font-size: 48px;
            margin: 0 0 20px 0;
        }
        p {
            font-size: 18px;
            margin: 0 0 30px 0;
            color: #bac2de;
        }
        a {
            display: inline-block;
            background: linear-gradient(135deg, #89b4fa 0%, #74c7ec 100%);
            color: #11111b;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 8px;
            font-weight: bold;
            transition: transform 0.2s;
        }
        a:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Access Denied</h1>
        <p>Для просмотра статистики необходима авторизация</p>
        <a href="../admin.html">Войти в админ-панель</a>
    </div>
</body>
</html>');
}

$jsonFile = __DIR__ . '/analytics.json';

if (!file_exists($jsonFile)) {
    die('No data yet');
}

$events = json_decode(file_get_contents($jsonFile), true) ?: [];

// Подсчёт статистики
$stats = [
    'total' => count($events),
    'by_event' => [],
    'by_date' => [],
    'unique_ips' => [],
];

foreach ($events as $event) {
    // По типу события
    $eventName = $event['event'];
    if (!isset($stats['by_event'][$eventName])) {
        $stats['by_event'][$eventName] = 0;
    }
    $stats['by_event'][$eventName]++;
    
    // По дате
    $date = date('Y-m-d', strtotime($event['timestamp']));
    if (!isset($stats['by_date'][$date])) {
        $stats['by_date'][$date] = 0;
    }
    $stats['by_date'][$date]++;
    
    // Уникальные IP
    $stats['unique_ips'][$event['ip']] = true;
}

$stats['unique_users'] = count($stats['unique_ips']);
unset($stats['unique_ips']);

// Сортируем по датам
ksort($stats['by_date']);

// Последние события
$recentEvents = array_slice(array_reverse($events), 0, 50);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Статистика редактора Avito</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #11111b;
            color: #cdd6f4;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #89b4fa;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #1e1e2e;
            border: 2px solid #313244;
            border-radius: 12px;
            padding: 20px;
        }
        .stat-card h3 {
            color: #74c7ec;
            margin: 0 0 10px 0;
            font-size: 14px;
            text-transform: uppercase;
        }
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            color: #a6e3a1;
        }
        .chart {
            background: #1e1e2e;
            border: 2px solid #313244;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .chart h2 {
            color: #89b4fa;
            margin: 0 0 20px 0;
            font-size: 18px;
        }
        .event-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .event-item {
            background: #181825;
            border-left: 3px solid #89b4fa;
            padding: 12px;
            margin-bottom: 8px;
            border-radius: 4px;
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 15px;
            align-items: center;
        }
        .event-name {
            color: #f9e2af;
            font-weight: 600;
        }
        .event-time {
            color: #6c7086;
            font-size: 12px;
        }
        .bar {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .bar-label {
            width: 200px;
            color: #bac2de;
        }
        .bar-fill {
            background: linear-gradient(90deg, #89b4fa, #74c7ec);
            height: 30px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding: 0 10px;
            color: #11111b;
            font-weight: bold;
            font-size: 14px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: #1e1e2e;
            border-radius: 8px;
            overflow: hidden;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #313244;
        }
        th {
            background: #181825;
            color: #89b4fa;
            font-weight: 600;
        }
        .refresh-btn {
            background: #a6e3a1;
            color: #11111b;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .refresh-btn:hover {
            background: #94e2d5;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Статистика редактора Avito</h1>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 Обновить</button>
        
        <!-- Основная статистика -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Всего событий</h3>
                <div class="stat-value"><?= number_format($stats['total']) ?></div>
            </div>
            <div class="stat-card">
                <h3>Уникальных пользователей</h3>
                <div class="stat-value"><?= number_format($stats['unique_users']) ?></div>
            </div>
            <div class="stat-card">
                <h3>Открытий редактора</h3>
                <div class="stat-value"><?= number_format($stats['by_event']['editor_opened'] ?? 0) ?></div>
            </div>
            <div class="stat-card">
                <h3>Экспортов изображений</h3>
                <div class="stat-value"><?= number_format($stats['by_event']['image_exported'] ?? 0) ?></div>
            </div>
        </div>
        
        <!-- По типам событий -->
        <div class="chart">
            <h2>📈 События по типам</h2>
            <?php 
            $maxCount = max($stats['by_event']);
            foreach ($stats['by_event'] as $event => $count): 
                $percentage = ($count / $maxCount) * 100;
            ?>
                <div class="bar">
                    <div class="bar-label"><?= htmlspecialchars($event, ENT_QUOTES, 'UTF-8') ?></div>
                    <div class="bar-fill" style="width: <?= min($percentage, 100) ?>%">
                        <?= htmlspecialchars($count, ENT_QUOTES, 'UTF-8') ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        
        <!-- По датам -->
        <div class="chart">
            <h2>📅 Активность по дням</h2>
            <table>
                <thead>
                    <tr>
                        <th>Дата</th>
                        <th>Событий</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach (array_reverse($stats['by_date'], true) as $date => $count): ?>
                        <tr>
                            <td><?= date('d.m.Y', strtotime($date)) ?></td>
                            <td><?= $count ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <!-- Последние события -->
        <div class="chart">
            <h2>🕒 Последние события (50)</h2>
            <ul class="event-list">
                <?php foreach ($recentEvents as $event): ?>
                    <li class="event-item">
                        <span class="event-name"><?= htmlspecialchars($event['event'] ?? 'Unknown', ENT_QUOTES, 'UTF-8') ?></span>
                        <span class="event-time">
                            <?= htmlspecialchars(date('d.m.Y H:i:s', strtotime($event['timestamp'] ?? 'now')), ENT_QUOTES, 'UTF-8') ?> | 
                            IP: <?= htmlspecialchars($event['ip'] ?? 'Unknown', ENT_QUOTES, 'UTF-8') ?>
                        </span>
                    </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>
</body>
</html>
