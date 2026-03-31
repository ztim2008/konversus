# TECH BOOTSTRAP

## Важно (текущая реализация)
- Core MVP API на текущем этапе реализован в PHP в каталоге `api/core`.
- Настройка БД/env/Яндекс ID: `docs/CORE-MVP-SETUP.md`.

## Stack
- Frontend: Next.js (App Router), TypeScript, Zustand, React Query, Tailwind, shadcn/ui.
- Backend: Node.js + NestJS (or Fastify), TypeScript, JWT auth.
- DB: PostgreSQL + Prisma.
- Queue/Cache: Redis + BullMQ.
- Worker: Node.js process with BullMQ processors.
- Storage: S3-compatible (MinIO/Yandex Object Storage).
- Deploy: Ubuntu VPS, PM2, Nginx, Let's Encrypt.

## API Surface (MVP)
- POST /auth/login
- GET /listings
- POST /listings
- POST /listings/:id/publish
- POST /ab-tests
- POST /ab-tests/:id/start
- GET /metrics/:id

## Queue Design
- publish-queue
- ab-rotation-queue
- metrics-collector-queue

## Worker Processors
- publish.processor.ts
- ab.processor.ts
- metrics.processor.ts

## Security Baseline
- helmet
- rate limit
- cors policy
- short-lived access token + refresh token

## MVP Execution Order
1. Auth
2. Listings CRUD
3. Builder UI minimal
4. Manual export
5. A/B logic without API automation
6. Integrations and full automation
