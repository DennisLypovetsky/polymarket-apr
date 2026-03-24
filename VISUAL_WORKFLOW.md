# Visual Workflow (Extension-Only)

Single workflow for development and release verification using only unpacked Chrome Extension mode.

## Source of Truth

- Main code: `polymarket-apr/content.js`
- Runtime package: `polymarket-apr/`

## Workflow

1. Open `chrome://extensions`.
2. Ensure Developer mode is enabled.
3. Load unpacked extension from `polymarket-apr/` (or keep it loaded).
4. After each code change, click `Reload` on the extension card.
5. Hard refresh Polymarket tab with `Ctrl+Shift+R`.
6. Validate behavior on target markets.

## Required Checks Before Commit

1. `BUY`: APR is visible and updates correctly.
2. `SELL`: APR is hidden.
3. `Limit/Market`: APR appears in the correct position with no duplicates.
4. Tooltip/time tag and animation remain correct.
5. No APR-related runtime errors in console.

## Release Verification

1. Confirm `manifest.json` version is correct.
2. Run smoke/regression scenarios from `TESTING_PRINCIPLES.md`.
3. Build release ZIP from `polymarket-apr/`.
4. Upload ZIP as GitHub Release asset.
