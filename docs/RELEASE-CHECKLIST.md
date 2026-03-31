# RELEASE CHECKLIST

## Before Release
- Update CHANGELOG.md.
- Validate tasks and scripts.
- Verify no WordPress dependency in root configs.
- Verify protected folders unchanged: avitologi, avitoeditor, html-enhancer, portfolio.

## Quality Gates
- Build passes for affected apps.
- Core smoke tests pass.
- Env variables documented and validated.
- Rollback plan updated in RUNBOOK.

## Release Steps
1. Tag release version.
2. Build artifacts.
3. Deploy API and worker.
4. Deploy web.
5. Run health checks.

## After Release
- Check error logs and queue backlog.
- Validate auth, listing create, export, A/B create.
- Announce release notes to team.
