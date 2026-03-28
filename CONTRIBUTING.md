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
3. Run APR checks from [TESTING_PRINCIPLES.md](TESTING_PRINCIPLES.md).
4. Run mandatory end-date regression scan:
   - `node .local/enddate-regression-scan.js --max-events 5000 --page-size 200 --out .local/enddate-regression-report.json`
5. For every `high-confidence` row in `.local/enddate-regression-report.json`, run manual smoke validation in unpacked extension mode and confirm no premature `Ended`.
6. Validate in Chrome via unpacked extension.
7. Delete previous release ZIP from `releases/` (if present).
8. Build local release archive `releases/polymarket-apr-vX.Y.zip`.
9. Upload the ZIP as a GitHub Release asset (do not commit ZIP binaries).
10. Merge the branch into `main`.
11. Create Git tag `vX.Y`.
12. Push branch, `main`, and tags to GitHub.

## Development Workflow (Required)

- Follow [VISUAL_WORKFLOW.md](VISUAL_WORKFLOW.md) for the extension-only cycle.
- Development and release verification use only unpacked extension mode from `polymarket-apr/`.
- Source of truth is always `polymarket-apr/content.js`.

Before commit, run the visual gate:

1. Enable unpacked extension from `polymarket-apr/`.
2. Reload extension in `chrome://extensions`.
3. Hard refresh Polymarket (`Ctrl+Shift+R`).
4. Verify APR block updates correctly, is hidden on `SELL`, visible on `BUY`, and tooltip/animation behavior remains correct.

## Git Identity

This repository uses local git config (`--local`) for commit author identity.
