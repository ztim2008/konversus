# LEGACY SANITIZATION

Правила подготовки legacy-папок перед их добавлением в публичный GitHub-репозиторий.

## Зачем это нужно

Legacy-папки нельзя просто «залить как есть» в публичный git.

Причины:
- внутри есть старые backup-артефакты;
- встречаются локальные env-файлы и примеры с реальными значениями;
- есть слабые или хардкоженные admin-пароли;
- часть логики не соответствует взрослому production-подходу.

Поэтому текущая политика такая:
- core-платформа уже зеркалится в GitHub;
- legacy-папки пока исключены из публичного mirror;
- каждая legacy-папка проходит санацию отдельно;
- только после этого она добавляется второй волной.

## Что уже обнаружено

### avitoeditor

Найдены блокеры:
- avitoeditor/.env содержит реальные локальные значения;
- avitoeditor/.env.example содержал реальные значения и был санитизирован;
- avitoeditor/backups содержит старые backup-файлы и .env;
- avitoeditor/assets/js/editor.js содержит хардкоженный admin-пароль;
- avitoeditor/assets/js/editor-test.js содержит хардкоженный admin-пароль;
- avitoeditor/assets/js/editor-test-backup.js содержит хардкоженный admin-пароль.
- avitoeditor/api/config.php содержал хардкоженные DB credentials;
- avitoeditor/api/payment-config.php и payment-эндпоинты содержали live payment secret в дефолтах;
- avitoeditor/api/payment-config.json и config/payment-config.json содержат локальные платежные секреты и не должны попадать в публичный git.
- avitoeditor/MIGRATION-SERVER-INSTRUCTIONS.md содержит старые примеры с реальными DB credentials и требует отдельной очистки перед публикацией.

Вывод:
- в публичный mirror нельзя добавлять без отдельного security-рефакторинга.

Что уже сделано:
- avitoeditor/.env.example санитизирован;
- активные auth/payment-эндпоинты переведены на локальный конфиг и env вместо хардкодов;
- editor и editor-test переведены с client-side admin-пароля на session-based admin flow;
- добавлен payment-config.example.json;
- добавлен integration contract для связки avitoeditor с core.

Что остается:
- отдельно разобрать backup-файлы и test-backup артефакты;
- решить, какие директории и данные будут versioned, а какие останутся runtime-only;
- только после этого добавлять avitoeditor второй волной в публичный git.

### avitologi

Найден блокер:
- avitologi/js/app.js содержит client-side пароль 111111.

Вывод:
- перед публикацией нужен вынос admin-доступа из client-side проверки.

### html-enhancer

Найден блокер:
- html-enhancer/auth.php содержит fallback-пароль admin.

Вывод:
- перед публикацией нужен нормальный конфиг авторизации без дефолтного fallback-пароля.

### portfolio

Папка пока не прошла отдельный security-аудит.

Вывод:
- в публичный mirror не добавляется до отдельной проверки.

## Правило второй волны

Перед добавлением любой legacy-папки в GitHub обязательно пройти чек:
1. Нет .env, dump, backup и архивов внутри git.
2. Нет реальных паролей, токенов, ключей и секретов в коде и примерах.
3. Нет client-side admin-доступа с хардкоженным паролем.
4. Есть README или setup-инструкция, как поднять подпроект локально.
5. Папка не ломает основной core-контур репозитория.

## Практический порядок санации

1. Сделать audit конкретной папки.
2. Исключить backup и env из git.
3. Заменить реальные значения на placeholders.
4. Убрать слабые admin-пароли и временные заглушки.
5. Только потом добавлять подпроект в публичный репозиторий отдельным commit.

## Текущий статус

- core-репозиторий: уже в GitHub;
- legacy-папки: временно исключены из public mirror через .gitignore;
- следующая взрослая задача: пройти санацию legacy-папок по одной, начиная с avitoeditor.