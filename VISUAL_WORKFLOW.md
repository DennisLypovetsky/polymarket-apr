# Visual Workflow (v1.2)

Combined workflow to get fast visual feedback and still validate real extension behavior before commits.

## Source of Truth

- Main code: `polymarket-apr/content.js`
- `dev/polymarket-apr-dev.user.js` is for fast iteration only.
- After accepting any userscript change, transfer it into `polymarket-apr/content.js`.

## Quick Start (Now)

1. Import `dev/polymarket-apr-dev.user.js` into Tampermonkey.
2. Open a Polymarket market page.
3. Toggle between mode A and mode B as needed.

## Mode A: Fast Iteration (Userscript)

1. Disable the unpacked Chrome extension.
2. Enable userscript `dev/polymarket-apr-dev.user.js` in Tampermonkey (or equivalent).
3. Refresh Polymarket tab.
4. Edit userscript and refresh page to see visual updates immediately.

## Mode B: Release Verification (Unpacked Extension)

1. Disable userscript.
2. Enable unpacked extension loaded from `polymarket-apr/`.
3. Click `Reload` for the extension in `chrome://extensions`.
4. Hard refresh Polymarket tab with `Ctrl+Shift+R`.

## Rules

1. Use fast mode for UI iteration speed.
2. Move accepted changes to `polymarket-apr/content.js`.
3. Always run release verification mode before committing.
4. Never run userscript and extension at the same time on the same tab.

## Optional Sync Helpers

- Update userscript from extension source:
  - `powershell -ExecutionPolicy Bypass -File dev/Sync-ContentToUserscript.ps1`
- Move accepted userscript changes back to extension source:
  - `powershell -ExecutionPolicy Bypass -File dev/Sync-UserscriptToContent.ps1`

## Acceptance Checklist

1. Fast mode: APR appears/updates without extension reload.
2. Release mode: behavior matches fast mode after reload + hard refresh.
3. In release mode:
   - `SELL` hides APR row.
   - `BUY` shows APR row.
   - Tooltip and animation are correct.
