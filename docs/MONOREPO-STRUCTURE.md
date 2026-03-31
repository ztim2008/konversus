# MONOREPO STRUCTURE

## Target Layout

root/
- apps/
  - web/
  - api/
  - worker/
- packages/
  - ui/
  - types/
  - utils/
- infra/
  - nginx/
  - docker/
- docs/

## Responsibility Map
- apps/web: dashboard, builder, A/B UI, billing UI.
- apps/api: auth, CRUD, paywall checks, integration APIs.
- apps/worker: publish jobs, metric collectors, A/B rotation.
- packages/ui: shared design system components.
- packages/types: DTOs, API response contracts, enums.
- packages/utils: common helpers, formatting, validators.
- infra/nginx: reverse-proxy, SSL-ready configs.
- infra/docker: optional local infra stack.

## Rules
- No business logic in packages/ui.
- API and worker must consume same contracts from packages/types.
- All environment variables documented in docs/ENV.md.
- Migration scripts and operational instructions go to docs/RUNBOOK.md.
