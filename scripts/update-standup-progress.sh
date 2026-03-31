#!/usr/bin/env bash
set -euo pipefail

FILE_PATH="${1:-docs/WEEKLY-BOARD-v2.md}"

if [[ ! -f "$FILE_PATH" ]]; then
  echo "Файл не найден: $FILE_PATH" >&2
  exit 1
fi

grid_block="$(awk '
  /<!-- STATUS_GRID_START -->/ {in_block=1; next}
  /<!-- STATUS_GRID_END -->/ {in_block=0}
  in_block {print}
' "$FILE_PATH")"

red_count="$(printf "%s" "$grid_block" | grep -o "🔴" | wc -l | tr -d ' ')"
blue_count="$(printf "%s" "$grid_block" | grep -o "🔵" | wc -l | tr -d ' ')"
green_count="$(printf "%s" "$grid_block" | grep -o "🟢" | wc -l | tr -d ' ')"

total=$((red_count + blue_count + green_count))
if [[ "$total" -eq 0 ]]; then
  percent="0"
else
  percent=$((green_count * 100 / total))
fi

progress_tmp="$(mktemp)"
awk -v red="$red_count" -v blue="$blue_count" -v green="$green_count" -v percent="$percent" '
  BEGIN {in_progress=0}
  /<!-- PROGRESS_START -->/ {
    print
    print "- 🔴 Запланировано: " red
    print "- 🔵 В работе: " blue
    print "- 🟢 Сделано: " green
    print "- Прогресс выполнения: " percent "%"
    in_progress=1
    next
  }
  /<!-- PROGRESS_END -->/ {
    in_progress=0
    print
    next
  }
  !in_progress {print}
' "$FILE_PATH" > "$progress_tmp"

mv "$progress_tmp" "$FILE_PATH"
echo "Обновлен автоподсчет: $FILE_PATH"
