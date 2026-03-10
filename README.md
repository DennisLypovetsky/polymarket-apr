# Polymarket APR

Chrome extension that adds a native-style APR (Annual Percentage Rate) block to the Polymarket trade widget.

## Install

The latest Chrome version is available in the Chrome Web Store:

- https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib

## Preview

<img src="pictures/screenshots/Screenshot.png" alt="Polymarket APR extension preview" width="960" />

## Local Development

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select the `polymarket-apr/` folder from this repository.

## Visual Dev Cycle (v1.2)

Use the combined workflow for fast UI iteration and release-safe checks:

- Fast mode (userscript): `dev/polymarket-apr-dev.user.js`
- Release mode (extension): `polymarket-apr/`
- Sync helpers: `dev/Sync-ContentToUserscript.ps1`, `dev/Sync-UserscriptToContent.ps1`
- Full steps and acceptance checklist: `VISUAL_WORKFLOW.md`

## Repository Structure

- `polymarket-apr/` - extension source used for development and testing
- `dev/` - local userscript workflow files for fast visual iteration
- `releases/` - release metadata/docs (ZIP binaries are published as GitHub Release assets)
- `pictures/` - icons, screenshots, and promo assets

## Development Workflow

See `CONTRIBUTING.md` for branching, versioning, and release flow.
