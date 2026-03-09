# Polymarket APR (Chrome Extension)

## Current Structure

- `polymarket-apr/` - single working folder for the extension source
- `pictures/` - design/media assets
- `releases/` - packaged release archives (`.zip`)

## Branching Model

- `main` - stable release-ready code
- `codex/vX.Y-fix` - feature/fix branches for next version work

## Release Flow

1. Create/update feature branch from `main`.
2. Make changes in `polymarket-apr/`.
3. Update `polymarket-apr/manifest.json` version.
4. Test in Chrome as unpacked extension.
5. Build zip to `releases/polymarket-apr-vX.Y.zip`.
6. Merge into `main`.
7. Create tag `vX.Y` on the release commit.

## Chrome Load Path

Use `polymarket-apr/` as the unpacked extension folder.
