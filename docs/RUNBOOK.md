# RUNBOOK

## Backup
- Keep filesystem snapshot before structural cleanup.
- Keep db dump before schema migrations.
- Keep release artifact archive for rollback.

## Deploy
1. Pull code and install dependencies.
2. Build affected apps.
3. Run migrations.
4. Restart processes (PM2).
5. Verify health endpoints.

## Rollback
1. Stop affected processes.
2. Restore previous build artifact.
3. Revert migrations if required.
4. Restore backup if destructive changes were applied.
5. Validate system health and auth flow.

## Incident Basics
- Collect request id and user id context.
- Check API logs first, then worker logs, then queue lag.
- If integration issue, isolate adapter and queue retries.
- Document root cause and preventive action in changelog/doc notes.
