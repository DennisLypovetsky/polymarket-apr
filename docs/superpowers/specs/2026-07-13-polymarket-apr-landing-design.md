# Polymarket APR Landing Page Design

## Goal

Build and publish a concise English landing page for Polymarket APR. The page should explain why estimated APR matters and send visitors to the Chrome Web Store.

The site targets desktop browsers at widths of 1 280 pixels and above. Mobile layouts, accounts, forms, analytics, and persistent data are out of scope.

## Project Structure

Keep the website in `website/` so the existing extension package remains unchanged. Build and publish the site through Codex Sites.

## Links

- `Add to Chrome`: `https://chromewebstore.google.com/detail/polymarket-apr/dainflhaaolcjggcopmjhpaodnleicib`
- `GitHub`: `https://github.com/DennisLypovetsky/polymarket-apr`

## Page Structure

Use four full-height sections with vertical scroll snapping. Keep the Polymarket APR name and GitHub link visible in a fixed header.

### 1. Install

- Copy: `compare` / `markets` / `by estimated APR`
- Show the approved dark Chrome Web Store screenshot as a separate image on the right.
- Match the page background to the screenshot background: `#15191D`.
- Place `Add to Chrome` below the heading.

### 2. Compare Similar Markets

- Copy: `same price` / `different return`
- Stack two 340-pixel Polymarket-style cards vertically.
- Card A: `97.4¢ YES`, `Est. APR 57% 17D`.
- Card B: `97.4¢ YES`, `Est. APR 31% 31D`.
- Match the live dark Polymarket widget: 16-pixel padding, 15-pixel radius, `#181D21` surface, `#242B32` border, 147 × 48-pixel outcome buttons, and a 12-pixel arrow with an 8-pixel visual gap after `Limit`.
- Match the extension row from `content.js`: 16-pixel label, 20-pixel APR and term, dotted underline, and green only for the APR value.

### 3. Compare Polymarket With DeFi

- Copy: `compare` / `Polymarket` / `with DeFi`
- Place two 340-pixel cards side by side.
- Left: a visually distinct USDC vault showing `9.7% APR`.
- Right: a Polymarket-style card showing `96.3¢ YES`, `Est. APR 17% 83D`, and `Trade`.
- Keep the products visually distinct. Use the exact Polymarket dimensions only on the Polymarket card.

### 4. Install Again

- Center all content.
- Copy: `just APR` / `nothing else`.
- Show only `Est. APR 53% 7D` and a larger `Add to Chrome` button.
- Do not add badges, privacy labels, or supporting paragraphs.

## Visual Language

- Use the screenshot's dark background and white-to-gray text hierarchy.
- Make one key phrase bold and keep supporting words regular or gray.
- Use Polymarket blue for primary buttons.
- Use Polymarket green only inside market controls and APR values.
- Do not introduce illustrations, gradients outside the vault card, or decorative badges.
- Use the supplied project icon and screenshots.

## Behavior

- Use vertical scroll snapping for the four sections.
- Keep interactions limited to the Chrome Web Store and GitHub links.
- Respect keyboard navigation and reduced-motion preferences.
- Preserve readable spacing and complete cards at 1 280 × 720 and larger viewports.

## Metadata

- Title: `Polymarket APR — Compare Markets by Estimated APR`
- Description: `See estimated APR inside Polymarket and compare markets with each other or with DeFi yield.`
- Add a site-specific social preview that follows the approved dark design.

## Verification

- Confirm both links use the approved URLs.
- Confirm every section fits at 1 280 × 720 without clipped content.
- Confirm the screenshot remains separate from the text and is not cropped.
- Confirm the second and third sections use 340-pixel Polymarket cards.
- Confirm the APR examples match the extension formula.
- Run the production build before publishing through Sites.
