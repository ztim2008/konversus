# Архивация проекта HTML Enhancer
$source = "html-enhancer"
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "_backups"
$zipName = "html-enhancer_v1.1_COMPLETE_$date.zip"

# Создаем папку для бэкапов, если нет
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Создана папка $backupDir" -ForegroundColor Green
}

# Путь к архиву
$destination = Join-Path $backupDir $zipName

# Архивация
Write-Host "Архивируем $source в $destination..." -ForegroundColor Yellow
Compress-Archive -Path $source -DestinationPath $destination -Force

Write-Host "Готово! Проект сохранен: $destination" -ForegroundColor Green
