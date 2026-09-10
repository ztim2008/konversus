# CURRENT_CONTEXT — срез «сейчас»

**Обновлено:** 2026-09-11 (~00:20 МСК)  
**Активный трек:** Лид-радар Auto  
**День закрыт:** MVP этапы 0–9 🟩

## Сейчас

| Этап | Статус |
|------|--------|
| 0–9 | 🟩 **MVP Auto закрыт** |

## Завтра (2026-09-11+)

**Цель дня:** прогнать систему end-to-end и выявить недостатки.  
**Гипотеза #1 (уже видна):** настройки радаров / ниш слишком узкие → нужны «жирные» клиенты (стройка, ремонт, услуги, производство) и умная ротация («рулетка»).

Промпт новой сессии: [docs/prompts/2026-09-11-lead-radar-polish.md](prompts/2026-09-11-lead-radar-polish.md)

## Инфра на проде

- App: `konversus-fpb` :3010  
- TG группа подключена (`telegram_chat_id`)  
- Cron: 06:00 nightly · 21:00 daily-report (МСК)  
- Секреты только в `.env.local` / settings — не в git

## Команды

```bash
npm run harness:check
npm run agent:loop -- --task lead_radar_nightly
# pm2 restart konversus-fpb --update-env
```
