# Contributing

## Branching Model

- `main` - stable, release-ready branch
- `codex/vX.Y-fix` - work branch for the next fix/release cycle

## Versioning

1. Update `polymarket-apr/manifest.json` version before release.
2. Keep one source folder: `polymarket-apr/` (no duplicate version folders).
3. Tag releases as `vX.Y` on `main`.

## Release Flow

1. Create or update a branch from `main` (example: `codex/v1.2-fix`).
2. Implement and test changes in `polymarket-apr/`.
3. Validate in Chrome via unpacked extension.
4. Build release archive to `releases/polymarket-apr-vX.Y.zip`.
5. Merge branch into `main`.
6. Create Git tag `vX.Y`.
7. Push branch, `main`, and tags to GitHub.

## Git Identity

This repository uses local git config (`--local`) for commit author identity.
