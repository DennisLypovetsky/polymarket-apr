# Releases Folder Policy

This folder is for release metadata, lightweight documentation, and one local upload artifact.

## What stays in git

- `README.md` and other small text files (`.md`, checksums, notes).

## What does not stay in git

- Versioned ZIP binaries such as `polymarket-apr-vX.Y.zip`.

ZIP files are built locally for publishing and uploaded to GitHub Releases as assets, but they are not committed.

## Local retention rule

- Keep only one local ZIP in `releases/`: the current release artifact.
- Before creating a new release ZIP, delete the previous ZIP from `releases/`.

## Naming convention

- `polymarket-apr-vX.Y.zip` (example: `polymarket-apr-v1.2.zip`).

## Publish flow (summary)

1. Delete previous ZIP from `releases/` (if present).
2. Build new ZIP locally from `polymarket-apr/`.
3. Create/publish GitHub Release for tag `vX.Y`.
4. Upload ZIP as a release asset.
