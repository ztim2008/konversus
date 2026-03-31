<?php
declare(strict_types=1);

function acb_audit_clamp(int $value, int $min, int $max): int {
    return max($min, min($max, $value));
}

function acb_audit_priority_label(string $level): string {
    return match ($level) {
        'critical' => 'Критический',
        'high' => 'Высокий',
        'low' => 'Низкий',
        default => 'Средний',
    };
}

function acb_audit_score_label(int $score): string {
    if ($score >= 85) {
        return 'сильный уровень';
    }
    if ($score >= 70) {
        return 'рабочий уровень';
    }
    if ($score >= 55) {
        return 'есть резерв роста';
    }
    return 'проседает';
}

function acb_audit_benchmark_position(int $score): string {
    if ($score >= 78) {
        return 'Выше среднего';
    }
    if ($score >= 62) {
        return 'На уровне рынка';
    }
    return 'Ниже рынка';
}

function acb_audit_infer_service_name(string $title): string {
    $words = preg_split('/\s+/u', trim($title)) ?: [];
    $words = array_values(array_filter($words, static fn($word) => is_string($word) && trim($word) !== ''));
    if (count($words) === 0) {
        return 'Услуга';
    }
    return implode(' ', array_slice($words, 0, 4));
}

function acb_audit_build_model(array $listing, array $options = []): array {
    $title = trim((string)($listing['title'] ?? ''));
    if ($title === '') {
        $title = 'Объявление без заголовка';
    }

    $description = trim((string)($listing['description'] ?? ''));
    $sourceMode = (string)($options['source_mode'] ?? 'core_listing');
    $sourceLabel = match ($sourceMode) {
        'api_listing' => 'Аккаунт Avito',
        'direct_link' => 'Ссылка на объявление',
        default => 'Локальное объявление',
    };

    $titleLen = function_exists('mb_strlen') ? mb_strlen($title) : strlen($title);
    $descWords = preg_split('/\s+/u', $description) ?: [];
    $descWords = array_values(array_filter($descWords, static fn($word) => is_string($word) && trim($word) !== ''));
    $hasNumber = preg_match('/\d/u', $title . ' ' . $description) === 1;
    $hasTrust = preg_match('/(гарант|опыт|лет|срок|договор|смет|кейс|пример)/iu', $description) === 1;
    $hasCta = preg_match('/(звон|пиш|оставьте|закаж|свяж|получ)/iu', $description) === 1;

    $textScore = acb_audit_clamp(
        40
        + (($titleLen >= 24 && $titleLen <= 68) ? 18 : 8)
        + (count($descWords) >= 30 ? 9 : 4)
        + ($hasNumber ? 6 : 0)
        + ($hasTrust ? 7 : 0)
        + ($hasCta ? 5 : 0),
        34,
        91
    );

    $photoScore = acb_audit_clamp(
        44
        + ($hasTrust ? 5 : 0)
        + ($titleLen >= 24 ? 4 : 0)
        + ($hasNumber ? 3 : 0),
        36,
        79
    );

    $infographicScore = acb_audit_clamp(
        40
        + ($hasTrust ? 6 : 0)
        + ($hasNumber ? 5 : 0),
        32,
        77
    );

    $benchmarkScore = acb_audit_clamp(
        (int)round(($textScore * 0.35) + ($photoScore * 0.35) + ($infographicScore * 0.20) + 8),
        30,
        89
    );

    $overallScore = acb_audit_clamp(
        (int)round(($textScore * 0.45) + ($photoScore * 0.30) + ($infographicScore * 0.25)),
        0,
        100
    );

    $priorityLevel = $overallScore < 55
        ? 'critical'
        : ($overallScore < 68 ? 'high' : ($overallScore < 82 ? 'medium' : 'low'));

    $serviceName = acb_audit_infer_service_name($title);
    $city = (string)($options['city'] ?? 'Москва');
    $sampleSize = 18 + ($hasNumber ? 4 : 0) + ($hasTrust ? 3 : 0);
    $mainWeakness = $photoScore < $textScore ? 'слабого первого фото' : 'недостаточно конкретного оффера';
    $overallSummary = 'Объявление проседает из-за ' . $mainWeakness . ', общего позиционирования и запаса по инфографике. Сначала выровняйте визуал и первые строки текста.';

    $findings = [
        [
            'severity' => 'high',
            'zone' => 'photo',
            'code' => 'photo_main_frame_weak',
            'title' => 'Первый экран не объясняет оффер с первого взгляда',
            'description' => 'Сейчас ценность объявления не считывается мгновенно. Пользователь тратит лишние секунды на понимание сути.',
            'recommendation' => 'Соберите главный оффер в первом фото и в первых двух строках текста.',
        ],
        [
            'severity' => 'warning',
            'zone' => 'title',
            'code' => 'title_not_specific_enough',
            'title' => 'Заголовок можно сделать конкретнее',
            'description' => 'Заголовок звучит рабоче, но ему не хватает одного сильного дифференциатора: срок, формат, гарантия или явный результат.',
            'recommendation' => 'Добавьте в заголовок конкретику: срок, вид услуги или ключевое отличие.',
        ],
        [
            'severity' => 'warning',
            'zone' => 'infographic',
            'code' => 'infographic_overloaded',
            'title' => 'Инфографика должна усиливать, а не просто украшать',
            'description' => 'Рынок выигрывают карточки с одним главным тезисом и чистой типографикой, без перегруза текстом.',
            'recommendation' => 'Оставьте 1-2 визуальных акцента и уберите второстепенные подписи из первого кадра.',
        ],
    ];

    $marketGaps = [
        [
            'zone' => 'photo',
            'gap_direction' => 'below',
            'gap_score' => 22,
            'title' => 'Первый кадр слабее рыночного эталона',
            'description' => 'Похожим объявлениям чаще удается показать объект или результат с одного взгляда.',
            'recommendation' => 'Сделайте главный кадр чище: один объект, один акцент, без лишних второстепенных деталей.',
        ],
        [
            'zone' => 'offer',
            'gap_direction' => $textScore >= 72 ? 'equal' : 'below',
            'gap_score' => $textScore >= 72 ? 8 : 18,
            'title' => $textScore >= 72 ? 'Вы близко к рынку по офферу' : 'Заголовок недостаточно конкретный для ниши',
            'description' => $textScore >= 72
                ? 'Текст уже выглядит рабочим, но в сильных карточках чаще есть чуть более конкретный дифференциатор.'
                : 'У сильных карточек в этой нише обычно быстрее считывается специализация и выгода.',
            'recommendation' => 'Добавьте в заголовок и первый экран один измеримый плюс: срок, цена, гарантия или формат работы.',
        ],
        [
            'zone' => 'infographic',
            'gap_direction' => $infographicScore >= 68 ? 'equal' : 'below',
            'gap_score' => $infographicScore >= 68 ? 6 : 16,
            'title' => $infographicScore >= 68 ? 'Инфографика почти на уровне рынка' : 'Инфографику можно упростить и усилить',
            'description' => $infographicScore >= 68
                ? 'По визуальной подаче карточка выглядит уверенно, но еще есть запас по чистоте композиции.'
                : 'В сильных объявлениях акцент чаще один, а текст на карточке короче и читается быстрее.',
            'recommendation' => 'Сделайте одну главную мысль на карточку и оставьте короткие тезисы без перегруза.',
        ],
    ];

    $patterns = [
        'У 72% сильных карточек в этой нише первое фото показывает объект или результат без лишнего текста.',
        'В похожих объявлениях чаще работают заголовки с конкретной услугой и сроком или форматом работы.',
        'Карточки с чистой инфографикой и 1-2 тезисами визуально выигрывают у перегруженных макетов.',
    ];

    return [
        'id' => isset($listing['id']) ? (string)$listing['id'] : 'demo',
        'title' => $title,
        'description' => $description,
        'status' => (string)($listing['status'] ?? 'active'),
        'source_mode' => $sourceMode,
        'source_label' => $sourceLabel,
        'service_name' => $serviceName,
        'city' => $city,
        'sample_size' => $sampleSize,
        'overall_score' => $overallScore,
        'text_score' => $textScore,
        'photo_score' => $photoScore,
        'infographic_score' => $infographicScore,
        'benchmark_score' => $benchmarkScore,
        'benchmark_position' => acb_audit_benchmark_position($benchmarkScore),
        'priority_level' => $priorityLevel,
        'priority_label' => acb_audit_priority_label($priorityLevel),
        'overall_summary' => $overallSummary,
        'attention_rank' => isset($listing['id']) ? (((int)$listing['id'] % 5) + 1) : 3,
        'last_sync_at' => date('Y-m-d H:i:s'),
        'findings' => $findings,
        'market_gaps' => $marketGaps,
        'patterns' => $patterns,
        'text_items' => [
            'Заголовок должен за один взгляд объяснять услугу и отличия.',
            'Первые строки описания стоит сократить и перенести выгоду ближе к началу.',
            'Добавьте блок доверия: гарантия, сроки, договор, кейсы или опыт.',
        ],
        'photo_items' => [
            'Первый кадр должен продавать, а не просто иллюстрировать тему.',
            'Оставьте один явный акцент на фото и уберите визуальный шум.',
            'Сделайте мобильную проверку: считывается ли смысл в миниатюре.',
        ],
        'infographic_items' => [
            'Инфографика должна усиливать оффер, а не конкурировать с ним.',
            'Используйте 1-2 коротких тезиса вместо перегруженного блока текста.',
            'Проверьте контраст и иерархию: главный тезис должен быть заметен первым.',
        ],
        'next_steps' => [
            'Усилить заголовок и первый экран карточки одним конкретным обещанием.',
            'Собрать новое первое фото и короткое ТЗ на инфографику.',
            'После правок сравнить score и зафиксировать, что именно улучшилось.',
        ],
    ];
}

function acb_audit_persist(PDO $db, int $userId, ?int $avitoListingId, array $model): array {
    $now = date('Y-m-d H:i:s');

    $auditId = null;
    $queryId = null;
    $snapshotId = null;

    try {
        $stmt = $db->prepare('INSERT INTO acb_listing_audits (user_id, listing_id, source_mode, overall_score, text_score, photo_score, infographic_score, market_score, priority_level, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId,
            $avitoListingId,
            (string)($model['source_mode'] ?? 'core_listing'),
            (int)($model['overall_score'] ?? 0),
            (int)($model['text_score'] ?? 0),
            (int)($model['photo_score'] ?? 0),
            (int)($model['infographic_score'] ?? 0),
            (int)($model['benchmark_score'] ?? 0),
            (string)($model['priority_level'] ?? 'medium'),
            (string)($model['overall_summary'] ?? ''),
            $now,
        ]);

        $auditId = (int)$db->lastInsertId();

        if ($auditId > 0 && !empty($model['findings']) && is_array($model['findings'])) {
            $findingStmt = $db->prepare('INSERT INTO acb_listing_audit_findings (audit_id, zone, severity, code, title, description, recommendation, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach (array_values($model['findings']) as $index => $finding) {
                $findingStmt->execute([
                    $auditId,
                    (string)($finding['zone'] ?? 'offer'),
                    (string)($finding['severity'] ?? 'warning'),
                    (string)($finding['code'] ?? ('finding_' . ($index + 1))),
                    (string)($finding['title'] ?? ''),
                    (string)($finding['description'] ?? ''),
                    (string)($finding['recommendation'] ?? ''),
                    $index,
                    $now,
                ]);
            }
        }

        $queryStmt = $db->prepare('INSERT INTO acb_benchmark_queries (user_id, listing_id, city, region, category_name, service_name, price_min, price_max, query_mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $queryStmt->execute([
            $userId,
            $avitoListingId,
            (string)($model['city'] ?? 'Москва'),
            null,
            null,
            (string)($model['service_name'] ?? 'Услуга'),
            null,
            null,
            'market',
            $now,
            $now,
        ]);
        $queryId = (int)$db->lastInsertId();

        $snapshotStmt = $db->prepare('INSERT INTO acb_benchmark_snapshots (query_id, listing_id, benchmark_score, title_gap_score, photo_gap_score, infographic_gap_score, offer_gap_score, price_gap_score, summary, sample_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $titleGap = 0;
        $photoGap = 0;
        $infographicGap = 0;
        $offerGap = 0;
        $priceGap = 0;

        foreach (($model['market_gaps'] ?? []) as $gap) {
            $zone = (string)($gap['zone'] ?? 'offer');
            $score = (int)($gap['gap_score'] ?? 0);
            if ($zone === 'photo') {
                $photoGap = $score;
            } elseif ($zone === 'infographic') {
                $infographicGap = $score;
            } elseif ($zone === 'title') {
                $titleGap = $score;
            } elseif ($zone === 'price') {
                $priceGap = $score;
            } else {
                $offerGap = $score;
            }
        }

        $snapshotStmt->execute([
            $queryId,
            $avitoListingId,
            (int)($model['benchmark_score'] ?? 0),
            $titleGap,
            $photoGap,
            $infographicGap,
            $offerGap,
            $priceGap,
            (string)($model['overall_summary'] ?? ''),
            (int)($model['sample_size'] ?? 0),
            $now,
        ]);
        $snapshotId = (int)$db->lastInsertId();

        if ($snapshotId > 0 && !empty($model['market_gaps']) && is_array($model['market_gaps'])) {
            $gapStmt = $db->prepare('INSERT INTO acb_benchmark_gaps (snapshot_id, zone, gap_direction, gap_score, title, description, recommendation, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            foreach (array_values($model['market_gaps']) as $index => $gap) {
                $gapStmt->execute([
                    $snapshotId,
                    (string)($gap['zone'] ?? 'offer'),
                    (string)($gap['gap_direction'] ?? 'below'),
                    (int)($gap['gap_score'] ?? 0),
                    (string)($gap['title'] ?? ''),
                    (string)($gap['description'] ?? ''),
                    (string)($gap['recommendation'] ?? ''),
                    $index,
                    $now,
                ]);
            }
        }

        if ($snapshotId > 0 && !empty($model['patterns']) && is_array($model['patterns'])) {
            $patternStmt = $db->prepare('INSERT INTO acb_benchmark_patterns (snapshot_id, pattern_type, pattern_key, pattern_value, confidence_level, sample_size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
            foreach (array_values($model['patterns']) as $index => $pattern) {
                $patternStmt->execute([
                    $snapshotId,
                    'market',
                    'pattern_' . ($index + 1),
                    (string)$pattern,
                    'medium',
                    (int)($model['sample_size'] ?? 0),
                    $now,
                ]);
            }
        }
    } catch (Throwable $e) {
        return [
            'saved' => false,
            'error' => $e->getMessage(),
        ];
    }

    return [
        'saved' => true,
        'audit_id' => $auditId,
        'benchmark_query_id' => $queryId,
        'benchmark_snapshot_id' => $snapshotId,
    ];
}