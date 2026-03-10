# Contributing

## Branching Model

- `main` - stable, release-ready branch
- `feature/<kebab-case>` - task-scoped branch for a single feature or fix
- Canonical example: `feature/market-apr`
- Always create new feature branches from the latest `main` (never from another feature branch)

## Create a New Branch

```bash
git checkout main
git pull --ff-only
git checkout -b feature/<name>
```

## Versioning

1. Update `polymarket-apr/manifest.json` version before release packaging.
2. Keep one source folder: `polymarket-apr/` (no duplicate version folders).
3. Tag releases as `vX.Y` on `main`.

## Release Flow

1. Create or update a feature branch from `main`.
2. Implement and test changes in `polymarket-apr/`.
3. Run APR checks from `TESTING_PRINCIPLES.md`.
4. Validate in Chrome via unpacked extension.
5. Build local release archive `releases/polymarket-apr-vX.Y.zip` and upload it as a GitHub Release asset (do not commit ZIP binaries).
6. Merge the branch into `main`.
7. Create Git tag `vX.Y`.
8. Push branch, `main`, and tags to GitHub.

## Visual Development Workflow (Required)

- Follow `VISUAL_WORKFLOW.md` for the combined fast/release cycle.
- Source of truth is always `polymarket-apr/content.js`.
- Never keep userscript and extension enabled together on the same Polymarket tab.

## Pre-commit Visual Gate (Required)

1. Disable userscript.
2. Enable unpacked extension from `polymarket-apr/`.
3. Reload extension in `chrome://extensions`.
4. Hard refresh Polymarket (`Ctrl+Shift+R`).
5. Verify:
   - APR block updates correctly.
   - Hidden on `SELL`, visible on `BUY`.
   - Tooltip and animation behave as expected.

## Git Identity

This repository uses local git config (`--local`) for commit author identity.
