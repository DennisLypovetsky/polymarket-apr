# APR Testing Principles

## Goal

- Verify APR renders and updates correctly in both `Limit` and `Market`.
- Prevent regressions in APR placement, calculation logic, and UI behavior.
- Keep a consistent smoke/regression process for all `content.js` changes.

## Required Scenario Matrix

| Scenario | What to verify | Expected result |
| --- | --- | --- |
| `Limit + BUY` | APR placement | APR is inserted right after `.limit-trade-info` |
| `Market + BUY` | APR placement | APR is inserted right before `.flex.flex-col.gap-4 > .flex.flex-1` (Trade CTA block) |
| `BUY -> SELL` in both modes | APR visibility | APR is hidden on `SELL` |
| `Amount = empty` in `Market` | APR calculation source | APR is calculated from selected outcome price and does not require entered amount |
| `Amount = +$1` in `Market` | Calculation stability | APR does not change only because amount changed (when selected outcome is unchanged) |
| Single market (`1` outcome) | General behavior | APR shows/hides/updates correctly |
| Multi market (`2+` outcomes) | General behavior | APR shows/hides/updates correctly |
| End date in current year | Time-to-resolve rendering | Time tag (`D`/`h`) and tooltip are correct |
| End date in next year | Long-horizon rendering | APR and time tag remain correct without formatting overflow |
| Market anchor missing | Fail-safe behavior | APR is not inserted into a wrong place and UI stays intact |
| Switch `Limit <-> Market` | Reinsertion and dedupe | APR is not duplicated and re-inserts in the correct zone after each switch |

## Pass/Fail Criteria

- `PASS`: all scenarios above pass without APR-related console errors or visual defects.
- `FAIL`: any of the following occurs:
  - APR appears in the wrong place.
  - APR is not hidden on `SELL`.
  - APR incorrectly depends on `Amount` in `Market` when outcome is unchanged.
  - APR is duplicated.
  - APR is inserted in a random location when the market anchor is missing.

## Smoke Regression Order

1. Open a non-crypto market and set `BUY`.
2. Validate `Limit` (placement and rendering).
3. Switch to `Market` and validate placement.
4. Validate `Amount` behavior: empty -> `+$1` (with the same selected outcome).
5. Switch `BUY -> SELL -> BUY` and verify hide/show behavior.
6. Switch `Limit <-> Market` multiple times and verify no duplicates.
7. Repeat steps 1-6 on:
   - at least one single market;
   - at least one multi market;
   - at least one market with end date in the current year;
   - at least one market with end date in the next year.

## Mandatory Pre-Release Gate (End-Date Regression)

Before packaging/uploading a release, run:

```bash
node .local/enddate-regression-scan.js --max-events 5000 --page-size 200 --out .local/enddate-regression-report.json
```

If `.local/enddate-regression-report.json` contains `highConfidence` rows, each listed market URL must be manually smoke-tested in unpacked extension mode.

## Bug Report Format

Use the following template:

```md
### BUG: <short-title>
- Date: YYYY-MM-DD
- Branch: feature/<name>
- Market URL: <url>
- Mode: Limit | Market
- Side: BUY | SELL
- Amount: empty | +$1 | custom
- Expected: <expected-behavior>
- Actual: <actual-behavior>
- Steps to reproduce:
  1. ...
  2. ...
  3. ...
- Evidence: screenshot/video/console snippet
- Severity: S1 | S2 | S3
```

Minimum bug report fields: URL, reproduction steps, expected/actual behavior, and one artifact (screenshot or video).
