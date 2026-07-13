# Polymarket APR Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish the approved four-section Polymarket APR landing page through Codex Sites.

**Architecture:** Keep the site in `website/` beside the extension. Use the Sites vinext starter, one React page, one stylesheet, and a small typed content module shared with tests. Store only the Sites project ID in `website/.openai/hosting.json`.

**Tech Stack:** React, TypeScript, vinext, Vite, CSS, Node test runner with `tsx`, Codex Sites

---

## File Map

- Create `website/app/site-content.ts`: approved links, comparison values, and APR calculation.
- Create `website/tests/site-content.test.ts`: link and APR regression tests.
- Modify `website/app/page.tsx`: four semantic full-height sections.
- Modify `website/app/globals.css`: approved desktop layout and Polymarket styling.
- Modify `website/app/layout.tsx`: title, description, and social metadata.
- Copy `pictures/icons/icon.png` to `website/public/icon.png`.
- Copy `pictures/screenshots/Screenshot.png` to `website/public/screenshot.png`.
- Create `website/public/og.png`: site-specific social card.
- Create `website/.openai/hosting.json`: Sites project binding.

### Task 1: Initialize the Sites Project

**Files:**
- Create: `website/**`

- [ ] **Step 1: Create the isolated site directory**

Run from the repository root:

```powershell
New-Item -ItemType Directory -Path website
```

Expected: `website/` exists and the extension files remain unchanged.

- [ ] **Step 2: Run the Sites initializer once**

Run the Sites plugin initializer with the absolute `website/` path as its target.

Expected: `website/app/page.tsx`, `website/app/layout.tsx`, `website/app/globals.css`, `website/package.json`, and `website/.openai/hosting.json` exist.

- [ ] **Step 3: Start the development server in a retained session**

Run from `website/`:

```powershell
npm run dev
```

Expected: the server prints one healthy local URL and stays running.

- [ ] **Step 4: Commit the starter**

```powershell
git add website
git commit -m "chore: initialize Sites landing page"
```

### Task 2: Add Tested Site Content

**Files:**
- Create: `website/tests/site-content.test.ts`
- Create: `website/app/site-content.ts`
- Modify: `website/package.json`

- [ ] **Step 1: Install the test runner**

Run from `website/`:

```powershell
npm install --save-dev tsx
```

Add this script to `website/package.json`:

```json
"test": "tsx --test tests/*.test.ts"
```

- [ ] **Step 2: Write the failing content test**

Create `website/tests/site-content.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { CHROME_URL, GITHUB_URL, examples, estimatedApr } from "../app/site-content";

test("uses the approved destinations", () => {
  assert.equal(
    CHROME_URL,
    "https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib",
  );
  assert.equal(GITHUB_URL, "https://github.com/DennisLypovetsky/polymarket-apr");
});

test("matches the extension APR examples", () => {
  for (const example of examples) {
    assert.equal(Math.round(estimatedApr(example.price, example.days)), example.apr);
  }
});
```

- [ ] **Step 3: Run the test and confirm failure**

```powershell
npm test
```

Expected: FAIL because `website/app/site-content.ts` does not exist.

- [ ] **Step 4: Add the minimal content module**

Create `website/app/site-content.ts`:

```ts
export const CHROME_URL =
  "https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib";
export const GITHUB_URL = "https://github.com/DennisLypovetsky/polymarket-apr";

export const examples = [
  { id: "near", price: 97.4, days: 17, apr: 57 },
  { id: "far", price: 97.4, days: 31, apr: 31 },
  { id: "defi", price: 96.3, days: 83, apr: 17 },
] as const;

export function estimatedApr(price: number, days: number): number {
  const roi = ((100 - price) / price) * 100;
  return (roi / days) * 365;
}
```

- [ ] **Step 5: Run the tests and confirm success**

```powershell
npm test
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit the tested content**

```powershell
git add website/app/site-content.ts website/tests/site-content.test.ts website/package.json website/package-lock.json
git commit -m "test: lock landing page content"
```

### Task 3: Build the Approved Page

**Files:**
- Modify: `website/app/page.tsx`
- Modify: `website/app/globals.css`
- Copy: `website/public/icon.png`
- Copy: `website/public/screenshot.png`

- [ ] **Step 1: Copy the approved assets**

```powershell
Copy-Item ..\pictures\icons\icon.png public\icon.png
Copy-Item ..\pictures\screenshots\Screenshot.png public\screenshot.png
```

- [ ] **Step 2: Replace the starter page**

Implement `website/app/page.tsx` with these exact sections and values:

```tsx
import { CHROME_URL, GITHUB_URL } from "./site-content";

const Arrow = () => <span aria-hidden="true" className="chevron" />;

function PolymarketCard({ apr, days, price, trade = false }: { apr: number; days: number; price: number; trade?: boolean }) {
  return (
    <article className="pm-card">
      <div className="pm-top">
        <div className="pm-tabs"><span className="pm-tab active">Buy</span><span className="pm-tab">Sell</span></div>
        <div className="pm-mode">Limit<Arrow /></div>
      </div>
      <div className="pm-divider" />
      <div className="pm-outcomes">
        <div className="pm-outcome yes">Yes <strong>{price.toFixed(1)}¢</strong></div>
        <div className="pm-outcome no">No <strong>{(100 - price).toFixed(1)}¢</strong></div>
      </div>
      <div className="pm-apr"><span>Est. APR</span><span className="apr-value">{apr}%</span><span className="days">{days}D</span></div>
      {trade ? <div className="trade-button">Trade</div> : null}
    </article>
  );
}

export default function Page() {
  return (
    <main>
      <nav className="nav" aria-label="Primary">
        <span className="brand"><img src="/icon.png" alt="" />Polymarket APR</span>
        <a className="github" href={GITHUB_URL}>GitHub ↗</a>
      </nav>
      <section className="screen">
        <div className="copy"><h1><strong>compare</strong><span>markets</span><small>by estimated APR</small></h1><a className="chrome" href={CHROME_URL}>Add to Chrome</a></div>
        <div className="shot-wrap"><img className="shot" src="/screenshot.png" alt="Polymarket APR inside the Polymarket trade panel" /></div>
      </section>
      <section className="screen">
        <div className="copy compact"><h1><strong>same price</strong><span>different return</span></h1></div>
        <div className="ticket-stack"><PolymarketCard price={97.4} apr={57} days={17} /><PolymarketCard price={97.4} apr={31} days={31} /></div>
      </section>
      <section className="screen">
        <div className="copy compact"><h1><strong>compare</strong><span>Polymarket</span><small>with DeFi</small></h1></div>
        <div className="comparison-panels">
          <article className="vault-card"><div className="vault-head"><span className="coin">$</span><span><strong>USDC vault</strong><small>stablecoin yield</small></span></div><div className="vault-body"><small>Supply APR</small><div className="vault-rate">9.7% <span>APR</span></div><div className="deposit">Deposit USDC</div></div></article>
          <PolymarketCard price={96.3} apr={17} days={83} trade />
        </div>
      </section>
      <section className="screen final-screen"><div className="final-content"><h1><strong>just APR</strong><span>nothing else</span></h1><div className="final-apr"><span>Est. APR</span><span className="apr-value">53%</span><span className="days">7D</span></div><a className="chrome" href={CHROME_URL}>Add to Chrome</a></div></section>
    </main>
  );
}
```

- [ ] **Step 3: Replace the starter stylesheet**

Implement `website/app/globals.css` with the approved desktop rules:

```css
:root { color-scheme: dark; background: #15191d; color: #f7f8f9; }
* { box-sizing: border-box; }
html { scroll-snap-type: y mandatory; background: #15191d; }
body { margin: 0; min-width: 1120px; background: #15191d; font-family: Inter, system-ui, sans-serif; }
.screen { display: grid; grid-template-columns: 40% 60%; width: 100%; height: 100vh; min-height: 680px; overflow: hidden; scroll-snap-align: start; }
.pm-card { width: 340px; padding: 16px; border: 1px solid #242b32; border-radius: 15px; background: #181d21; }
.pm-outcomes { display: flex; width: 306px; gap: 12px; }
.pm-outcome { width: 147px; height: 48px; border-radius: 9px; }
.pm-mode { display: flex; justify-content: flex-end; width: 90px; gap: 4px; font-size: 14px; font-weight: 500; }
.chevron { position: relative; flex: 0 0 12px; width: 12px; height: 12px; margin-left: 4px; }
.pm-apr { display: grid; grid-template-columns: 1fr auto auto; gap: 6px; padding-top: 8px; border-top: 1px dashed #303840; }
.apr-value { color: #37c779; font-size: 20px; font-weight: 500; }
.days { color: #7b8996; font-size: 20px; font-weight: 500; text-decoration: underline dotted; text-underline-offset: 4px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

Complete the stylesheet with these exact rules:

- fixed header: `top: 0`, `height: 72px`, `padding: 0 48px`, brand at left and GitHub at right;
- section content: `padding: 96px 7vw 40px`, vertically centered, with no paragraph below the heading;
- heading: `clamp(54px, 5.6vw, 86px)`, `0.92` line height; bold first line, regular second line, muted third line;
- screenshot: right-aligned, fully visible, `max-width: 560px`, `max-height: calc(100vh - 128px)`, `object-fit: contain`;
- Chrome button: blue `#3f8efc`, white text, 48px high; final-screen button 58px high and wider;
- second screen: two 340px cards in one vertical stack, centered in the right column, with 18px gap;
- Polymarket card: exact dimensions above; 16px tab text, 14px Limit text, 12px chevron with 8px effective visual separation; 48px outcome buttons;
- third screen: one horizontal row of two 340px cards with 24px gap; the vault uses a navy surface, circular USDC mark, 9.7% rate, and blue deposit button so it cannot be confused with Polymarket;
- final screen: one centered column, centered heading, APR row, and large Chrome button;
- at `max-height: 760px`: section padding `84px 6vw 28px`, heading maximum 68px, screenshot maximum height `calc(100vh - 112px)`, and card padding 14px.

Do not add mobile behavior, a fifth section, badges, body copy, or decorative accent colors.

- [ ] **Step 4: Remove starter preview code**

Delete `website/app/_sites-preview` and remove its imports. Remove `react-loading-skeleton` if no finished component uses it.

- [ ] **Step 5: Verify content and build**

```powershell
npm test
npm run build
```

Expected: tests pass and the production build succeeds.

- [ ] **Step 6: Commit the page**

```powershell
git add website
git commit -m "feat: build Polymarket APR landing page"
```

### Task 4: Add Metadata and Social Preview

**Files:**
- Modify: `website/app/layout.tsx`
- Create: `website/public/og.png`

- [ ] **Step 1: Generate one social preview**

Generate one landscape image that reuses the approved `#15191D` background, bold-to-gray type hierarchy, Polymarket trade card, and `compare markets by estimated APR` copy. Save the validated result as `website/public/og.png`.

- [ ] **Step 2: Replace starter metadata**

Set `website/app/layout.tsx` metadata to:

```tsx
const host = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(host),
  title: "Polymarket APR — Compare Markets by Estimated APR",
  description: "See estimated APR inside Polymarket and compare markets with each other or with DeFi yield.",
  openGraph: { images: [new URL("/og.png", host).toString()] },
  twitter: { card: "summary_large_image", images: [new URL("/og.png", host).toString()] },
};
```

Keep the existing root layout wrapper and global CSS import.

- [ ] **Step 3: Run the final local checks**

```powershell
npm test
npm run build
```

Expected: tests pass, the build succeeds, and `website/dist/server/index.js` exists.

- [ ] **Step 4: Commit metadata**

```powershell
git add website/app/layout.tsx website/public/og.png
git commit -m "feat: add landing page metadata"
```

### Task 5: Publish Through Sites

**Files:**
- Modify: `website/.openai/hosting.json`

- [ ] **Step 1: Create the Sites project once**

Read `website/.openai/hosting.json`. If `project_id` is absent, create one Sites project and write only that opaque ID into the file.

- [ ] **Step 2: Commit the exact validated source**

```powershell
git add website/.openai/hosting.json
git commit -m "chore: bind Sites project"
git rev-parse HEAD
```

Expected: the returned SHA identifies the source that will be published.

- [ ] **Step 3: Push the exact source state**

Push the current branch with the Sites source credential as a per-command authorization header. Do not store the credential in Git configuration or a remote URL.

- [ ] **Step 4: Package and save one version**

Run the Sites `package-site.sh` helper against `website/`, then save one version with the pushed commit SHA and the generated archive.

- [ ] **Step 5: Deploy privately and poll status**

Deploy the saved version privately. Poll deployment status until it reports `succeeded` or `failed`.

- [ ] **Step 6: Open the published site**

Open the exact deployed URL in Codex and return it to the user.

- [ ] **Step 7: Stop temporary local servers**

Stop the Sites development server and the brainstorming preview server. Remove temporary packaging archives.
