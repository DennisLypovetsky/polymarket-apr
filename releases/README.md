# Releases Folder Policy

This folder is for release metadata and lightweight documentation only.

## What stays in git

- `README.md` and other small text files (`.md`, checksums, notes).

## What does not stay in git

- Versioned ZIP binaries such as `polymarket-apr-vX.Y.zip`.

ZIP files are built locally for publishing and uploaded to GitHub Releases as assets.

## Naming convention

- `polymarket-apr-vX.Y.zip` (example: `polymarket-apr-v1.2.zip`).

## Publish flow (summary)

1. Build ZIP locally from `polymarket-apr/`.
2. Create/publish GitHub Release for tag `vX.Y`.
3. Upload ZIP as a release asset.
4. Remove local ZIP after publishing.
