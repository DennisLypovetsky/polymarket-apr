(function () {
  'use strict';

  const RUNTIME_KEY = '__polyAprRuntime';
  const prevRuntime = window[RUNTIME_KEY];
  if (prevRuntime && typeof prevRuntime.destroy === 'function') {
    try {
      prevRuntime.destroy();
    } catch {
      // Ignore cleanup errors from older runtime versions.
    }
  }

  const runtime = {};
  window[RUNTIME_KEY] = runtime;

  // Remove stale rows left by previous manual injections.
  document.querySelectorAll('#poly-custom-apr').forEach((el) => el.remove());

  const STYLE_ID = 'poly-apr-styles-v20';
  document.getElementById('poly-apr-styles-v18')?.remove();
  document.getElementById('poly-apr-styles-v19')?.remove();
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .poly-apr-row {
        display: grid;
        grid-template-rows: 1fr;
        opacity: 1;
        transition: grid-template-rows 0.18s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.12s ease;
      }

      .poly-apr-clip {
        overflow: hidden;
        min-height: 0;
      }

      .poly-apr-body {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 8px;
        margin-top: 8px;
        border-top: 1px dashed var(--color-border, rgba(255,255,255,0.1));
      }

      .poly-apr-row.poly-apr-hidden {
        grid-template-rows: 0fr;
        opacity: 0;
        pointer-events: none;
      }

      @keyframes polyFadeSlide {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }

      .poly-anim-enter {
        animation: polyFadeSlide 0.12s ease;
      }

      .poly-apr-time { cursor: help; }

      @media (prefers-reduced-motion: reduce) {
        .poly-apr-row,
        .poly-anim-enter {
          transition: none;
          animation: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const CLASS_ACTIVE = 'text-green-600 dark:text-green-500 text-[20px] leading-6 font-medium';
  const CLASS_INACTIVE = 'text-neutral-500 text-[20px] leading-6 font-medium';

  const LIMIT_ANCHOR_SELECTOR = '.limit-trade-info';
  const MARKET_ANCHOR_SELECTOR = [
    '.flex.flex-col.gap-4 > .flex.flex-1',
    '.flex.flex-col.gap-4 > .flex.flex-col.gap-2.w-full'
  ];
  const MARKET_BUTTON_SELECTOR = 'button.trading-button:not([value])';
  const CENTS_PATTERN = /(\d+(?:[.,]\d+)?)\s*\u00A2/;
  const STABILITY_DELAY_MS = 120;
  const MARKET_SWITCH_SETTLE_MS = 360;
  const SIDE_SWITCH_SETTLE_MS = 260;

  // polymarket.com hreflang locales. English has no prefix. en-US is polymarket.us.
  const LOCALES = new Set([
    'bn', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'pl', 'ru',
    'th', 'tl', 'uk', 'vi', 'zh', 'zh-hant'
  ]);

  function getRouteParts() {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length && LOCALES.has(parts[0].toLowerCase())) return parts.slice(1);
    return parts;
  }

  function controlValue(el) {
    return (el?.getAttribute('value') || '').toUpperCase();
  }

  function isCheckedControl(el) {
    if (!el) return false;
    return el.getAttribute('data-state') === 'checked' || el.getAttribute('aria-checked') === 'true';
  }

  // Buy/Sell and Market/Limit keep these values when the visible label is translated.
  function findCheckedValue(root, value) {
    if (!root) return null;
    const wanted = value.toUpperCase();
    const nodes = root.querySelectorAll('button[value], [role="radio"][value]');
    for (const node of nodes) {
      if (controlValue(node) === wanted && isCheckedControl(node)) return node;
    }
    return null;
  }

  const state = {
    dom: { container: null, valSpan: null, timeSpan: null },
    lastAprText: null,
    lastTime: null,
    lastColorMode: null,
    scheduled: false,
    settleTimerId: null,
    marketSwitchUntil: 0,
    sideSwitchUntil: 0,
    lastMarketLabel: null,
    lastBuyActive: null,
    appliedInputKey: null,
    pendingInputKey: null,
    pendingInputSince: 0,
    lastOutcomePrice: null
  };

  function isBuyActive(widget) {
    if (findCheckedValue(widget, 'BUY')) return true;
    if (findCheckedValue(widget, 'SELL')) return false;

    const checkedSide = widget.querySelector(
      '[role="radiogroup"] [role="radio"][aria-checked="true"], [role="radiogroup"] [role="radio"][data-state="checked"]'
    );
    const value = controlValue(checkedSide);
    if (value === 'BUY') return true;
    if (value === 'SELL') return false;
    return /\bbuy\b/i.test(checkedSide?.textContent || '');
  }

  function readModeText(button) {
    const text = normalizeSpaces(button?.textContent || '').toLowerCase();
    return text === 'limit' || text === 'market' ? text : null;
  }

  // The closed Market/Limit control is one plain button: the current word plus a
  // chevron. Menu items are separate and carry data-state even while unchecked.
  function isClosedModeTrigger(button) {
    if (!button || !isElementVisible(button) || !readModeText(button)) return false;
    if (button.getAttribute('data-state') || button.getAttribute('aria-checked')) return false;
    if ((button.getAttribute('role') || '') === 'menuitemradio') return false;
    return true;
  }

  function getOrderType(widget) {
    if (findCheckedValue(widget, 'MARKET')) return 'market';
    if (findCheckedValue(widget, 'LIMIT')) return 'limit';

    const visibleModeButtons = Array.from(widget.querySelectorAll('button')).filter((button) => {
      return isElementVisible(button) && !!readModeText(button);
    });
    const checkedMode = visibleModeButtons.find((button) => isCheckedControl(button));
    if (checkedMode) return readModeText(checkedMode);

    const triggers = visibleModeButtons.filter((button) => isClosedModeTrigger(button));
    if (triggers.length === 1) return readModeText(triggers[0]);

    const sideSelectionBtn = widget.querySelector('button[aria-label="side selection"]');
    const sideLabel = normalizeSpaces(sideSelectionBtn?.querySelector('p,span')?.textContent || '').toLowerCase();
    const sideText = normalizeSpaces(sideSelectionBtn?.textContent || '').toLowerCase();

    if (sideLabel === 'limit' || sideLabel === 'market') return sideLabel;
    if (/\blimit\b/i.test(sideText) && !/\bmarket\b/i.test(sideText)) return 'limit';
    if (/\bmarket\b/i.test(sideText) && !/\blimit\b/i.test(sideText)) return 'market';

    // The checkout block matches the market anchor inside the limit form too.
    // .limit-trade-info is rendered only for a limit order, so it wins.
    if (pickVisibleAnchor(widget, LIMIT_ANCHOR_SELECTOR)) return 'limit';
    if (pickVisibleAnchor(widget, MARKET_ANCHOR_SELECTOR)) return 'market';

    return null;
  }

  function isElementVisible(el) {
    return !!(el && (el.offsetParent || el.getClientRects().length));
  }

  function pickVisibleAnchor(widget, selectorOrSelectors) {
    const selectors = Array.isArray(selectorOrSelectors)
      ? selectorOrSelectors
      : [selectorOrSelectors];

    for (const selector of selectors) {
      const anchors = widget.querySelectorAll(selector);
      for (const anchor of anchors) {
        if (isElementVisible(anchor)) return anchor;
      }
    }

    return null;
  }

  function getActiveTradeWidget() {
    const widgets = document.querySelectorAll('#trade-widget');
    if (!widgets.length) return null;

    let visibleFallback = null;

    for (const widget of widgets) {
      if (!isElementVisible(widget)) continue;
      if (!visibleFallback) visibleFallback = widget;

      // Prefer the interactive, currently visible trade widget.
      const hasModeSwitcher = !!widget.querySelector('button[aria-label="side selection"]');
      const hasOutcomeControls = !!widget.querySelector('#outcome-buttons, [role="radiogroup"]');
      if (hasModeSwitcher && hasOutcomeControls) return widget;
    }

    return visibleFallback || widgets[0] || null;
  }

  function removeDuplicateAprRows() {
    const rows = document.querySelectorAll('#poly-custom-apr');
    for (const row of rows) {
      if (row !== state.dom.container) row.remove();
    }
  }

  function formatSmartAPR(apr) {
    if (!isFinite(apr)) return '\u221E';
    if (apr < 0) return '0%';

    if (apr < 10) return apr.toFixed(1) + '%';
    if (apr < 1000) return Math.round(apr).toLocaleString() + '%';
    if (apr < 10000) return (apr / 1000).toFixed(1) + 'k%';
    if (apr < 100000) return Math.round(apr / 1000).toLocaleString() + 'k%';
    if (apr < 1000000) return (Math.round(apr / 100000) * 100).toLocaleString() + 'k%';
    return '>1M%';
  }

  function bump(el) {
    if (!el) return;
    el.classList.remove('poly-anim-enter');
    void el.offsetWidth;
    el.classList.add('poly-anim-enter');
  }

  function setRowHidden(hidden) {
    const row = state.dom.container;
    if (!row) return;
    row.style.display = '';
    row.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    if (hidden) {
      row.classList.add('poly-apr-hidden');
      return;
    }
    if (!row.classList.contains('poly-apr-hidden')) return;
    // Paint the collapsed box first, so a reinserted row eases open.
    void row.offsetHeight;
    row.classList.remove('poly-apr-hidden');
  }

  function scheduleUpdate() {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(() => {
      state.scheduled = false;
      update();
    });
  }

  function scheduleSettledUpdate(delayMs = STABILITY_DELAY_MS) {
    if (state.settleTimerId) return;

    const safeDelay = Math.max(0, Math.round(delayMs));
    state.settleTimerId = setTimeout(() => {
      state.settleTimerId = null;
      scheduleUpdate();
    }, safeDelay);
  }

  function shouldDeferRender(inputKey) {
    if (state.appliedInputKey === null) {
      state.appliedInputKey = inputKey;
      state.pendingInputKey = null;
      state.pendingInputSince = 0;
      return false;
    }

    if (state.appliedInputKey === inputKey) {
      state.pendingInputKey = null;
      state.pendingInputSince = 0;
      return false;
    }

    const now = performance.now();

    if (state.pendingInputKey !== inputKey) {
      state.pendingInputKey = inputKey;
      state.pendingInputSince = now;
      scheduleSettledUpdate();
      return true;
    }

    const elapsed = now - state.pendingInputSince;
    if (elapsed < STABILITY_DELAY_MS) {
      scheduleSettledUpdate(STABILITY_DELAY_MS - elapsed);
      return true;
    }

    state.appliedInputKey = inputKey;
    state.pendingInputKey = null;
    state.pendingInputSince = 0;
    return false;
  }

  function readWidgetMarketLabel(widget) {
    const primary = widget.querySelector('.font-semibold.text-heading-lg');
    const primaryText = normalizeSpaces(primary?.textContent || '');
    if (primaryText && parseOutcomeLabelExact(primaryText)) return primaryText;

    const candidates = widget.querySelectorAll('.font-semibold, .font-medium');
    for (const candidate of candidates) {
      const text = normalizeSpaces(candidate.textContent || '');
      if (!text || text.length > 64) continue;
      if (parseOutcomeLabelExact(text)) return text;
    }

    return null;
  }

  function readSelectedMarketName(widget) {
    if (!widget) return null;

    // Outcome prices use the same class and can appear before the group header.
    const titled = widget.querySelectorAll('.text-base.font-semibold');
    for (const node of titled) {
      const text = normalizeSpaces(node.textContent || '');
      const dot = text.indexOf('·');
      if (dot <= 0) continue;
      const name = normalizeSpaces(text.slice(0, dot));
      if (name) return name;
    }

    // Group title is the leaf immediately before the "·" separator.
    for (const node of widget.querySelectorAll('.truncate.min-w-0')) {
      const text = normalizeSpaces(node.textContent || '');
      if (!text || text.includes('·') || text.length > 80) continue;
      const next = node.nextElementSibling;
      if (next && normalizeSpaces(next.textContent || '') === '·') return text;
    }

    return null;
  }

  function elementOrAncestorContainsText(el, text) {
    if (!el || !text) return false;

    let current = el;
    for (let depth = 0; current && depth < 6; depth += 1) {
      if (normalizeSpaces(current.textContent || '').includes(text)) return true;
      current = current.parentElement;
    }

    return false;
  }

  function readExternalOutcomePrice(widget, sideText) {
    const side = normalizeSpaces(sideText || '');
    if (!/^(?:yes|no)$/i.test(side)) return null;

    const selectedMarketName = readSelectedMarketName(widget);
    let fallbackParsed = null;

    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (widget.contains(button) || !isElementVisible(button)) continue;

      const text = normalizeSpaces(button.innerText || button.textContent || '');
      const matchesBuyLabel = new RegExp(`^Buy\\s+${side}\\b`, 'i').test(text);
      const matchesValue = controlValue(button) === side.toUpperCase();
      if (!matchesBuyLabel && !matchesValue) continue;

      const parsed = parseCents(text);
      if (parsed === null) continue;
      if (fallbackParsed === null) fallbackParsed = parsed;

      if (selectedMarketName && elementOrAncestorContainsText(button, selectedMarketName)) {
        return parsed;
      }
    }

    return selectedMarketName ? null : fallbackParsed;
  }

  function parseMaybeJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return null;

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function readEmbeddedOutcomePrice(sideText) {
    const side = normalizeSpaces(sideText || '').toLowerCase();
    if (side !== 'yes' && side !== 'no') return null;

    const script = document.getElementById('__NEXT_DATA__');
    if (!script?.textContent) return null;

    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      return null;
    }

    const pathSlugs = getRouteParts().slice(1);
    let bestMatch = null;

    const visit = (value) => {
      if (!value || typeof value !== 'object') return;

      if (Array.isArray(value)) {
        for (const item of value) visit(item);
        return;
      }

      const outcomes = parseMaybeJsonArray(value.outcomes);
      const prices = parseMaybeJsonArray(value.outcomePrices);
      if (outcomes && prices) {
        const index = outcomes.findIndex((outcome) => normalizeSpaces(String(outcome)).toLowerCase() === side);
        const rawPrice = index >= 0 ? parseFloat(prices[index]) : NaN;
        const cents = rawPrice > 0 && rawPrice <= 1 ? rawPrice * 100 : rawPrice;

        if (isFinite(cents) && cents > 0 && cents < 100) {
          let score = 0;
          if (pathSlugs.includes(value.slug)) score += 10;
          if (pathSlugs.includes(value.eventSlug)) score += 5;
          if (value.closed) score -= 10;

          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { cents, score };
          }
        }
      }

      for (const child of Object.values(value)) visit(child);
    };

    visit(data);
    return bestMatch?.cents ?? null;
  }

  function isExternalMarketSwitchTrigger(target) {
    if (!target || !target.closest) return false;

    const button = target.closest('button');
    if (!button || button.closest('#trade-widget')) return false;

    if (controlValue(button) === 'SELL') return false;

    // Outcome rows keep a cents price. The verb is translated ("Kaufen", "Купить").
    return parseCents(button.innerText || button.textContent || '') !== null;
  }

  function armMarketSwitchSettle() {
    const nextUntil = performance.now() + MARKET_SWITCH_SETTLE_MS;
    state.marketSwitchUntil = Math.max(state.marketSwitchUntil, nextUntil);
    scheduleSettledUpdate(MARKET_SWITCH_SETTLE_MS);
  }

  function armSideSwitchSettle() {
    const nextUntil = performance.now() + SIDE_SWITCH_SETTLE_MS;
    state.sideSwitchUntil = Math.max(state.sideSwitchUntil, nextUntil);
    scheduleSettledUpdate(SIDE_SWITCH_SETTLE_MS);
  }

  function shouldWaitForMarketSwitchSettle(orderType) {
    if (orderType === 'limit') {
      state.marketSwitchUntil = 0;
      return false;
    }

    const remaining = state.marketSwitchUntil - performance.now();
    if (remaining <= 0) {
      state.marketSwitchUntil = 0;
      return false;
    }

    scheduleSettledUpdate(remaining);
    return true;
  }

  function shouldWaitForSideSwitchSettle(isBuy) {
    if (!isBuy) {
      state.sideSwitchUntil = 0;
      return false;
    }

    const remaining = state.sideSwitchUntil - performance.now();
    if (remaining <= 0) {
      state.sideSwitchUntil = 0;
      return false;
    }

    scheduleSettledUpdate(remaining);
    return true;
  }

  // ---------- DATE ----------
  const WEEK_OF_RE = /^Week of\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i;
  const DATE_LABEL_RE = /^(?:by\s+)?([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i;
  const WEEK_OF_FREE_RE = /\bWeek of\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/i;
  const DATE_FREE_RE = /\bby\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/i;
  const SCHEDULED_DATE_RE = /\b(?:currently\s+)?scheduled\s+for\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/ig;
  const IANA_TZ_RE = /\b([A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)\b/g;
  const RULES_START_RE = /This market will resolve/i;
  const EXPLICIT_TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i;

  const MONTH_INDEX = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  const TZ_ALIAS = [
    { re: /\bCEST\b/i, timeZone: 'Europe/Berlin' },
    { re: /\bCET\b/i, timeZone: 'Europe/Berlin' },
    { re: /\bEastern European Time\b/i, timeZone: 'Europe/Kyiv' },
    { re: /\bEEST\b/i, timeZone: 'Europe/Kyiv' },
    { re: /\bEET\b/i, timeZone: 'Europe/Kyiv' },
    { re: /\bPacific Time\b/i, timeZone: 'America/Los_Angeles' },
    { re: /\bPDT\b/i, timeZone: 'America/Los_Angeles' },
    { re: /\bPST\b/i, timeZone: 'America/Los_Angeles' },
    { re: /\bPT\b/i, timeZone: 'America/Los_Angeles' },
    { re: /\bEastern Time\b/i, timeZone: 'America/New_York' },
    { re: /\bEDT\b/i, timeZone: 'America/New_York' },
    { re: /\bEST\b/i, timeZone: 'America/New_York' },
    { re: /\bET\b/i, timeZone: 'America/New_York' },
    { re: /\bUTC\b/i, timeZone: 'UTC' },
    { re: /\bGMT\b/i, timeZone: 'UTC' },
  ];

  function normalizeSpaces(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function isValidDate(date) {
    return date instanceof Date && isFinite(date.getTime());
  }

  function isValidIanaTimeZone(timeZone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
      return true;
    } catch {
      return false;
    }
  }

  function isValidCalendarDate(year, monthIndex, day) {
    if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) return false;
    if (day < 1 || day > 31) return false;

    const d = new Date(Date.UTC(year, monthIndex, day));
    return d.getUTCFullYear() === year &&
      d.getUTCMonth() === monthIndex &&
      d.getUTCDate() === day;
  }

  function getEventJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || '');
        if (data?.['@type'] === 'Event') return data;
      } catch { }
    }
    return null;
  }

  let embeddedEventCache = { slug: null, texts: [], event: null };

  function getEmbeddedEvent() {
    const slug = getRouteParts()[1];
    if (!slug) return null;

    const texts = Array.from(document.scripts)
      .filter((script) => script.id === '__NEXT_DATA__' ||
        script.textContent.startsWith('self.__next_f.push('))
      .map((script) => script.textContent);
    if (embeddedEventCache.slug === slug && texts.length === embeddedEventCache.texts.length &&
      texts.every((text, index) => text === embeddedEventCache.texts[index])) {
      return embeddedEventCache.event;
    }

    let event = null;
    const visit = (value) => {
      if (event || !value || typeof value !== 'object') return;
      if (value.slug === slug && Array.isArray(value.markets)) {
        event = value;
        return;
      }
      for (const child of Object.values(value)) visit(child);
    };

    let payload = '';
    for (const text of texts) {
      try {
        const push = text.match(/^self\.__next_f\.push\(([\s\S]+)\);?$/);
        if (push) {
          const chunk = JSON.parse(push[1]);
          if (chunk[0] === 1 && typeof chunk[1] === 'string') payload += chunk[1];
        } else {
          visit(JSON.parse(text));
        }
      } catch { }
    }

    // Read embedded page data without executing the site's scripts.
    for (const record of payload.matchAll(/[\da-f]+:(\["\$",[^\n]+)/g)) {
      if (event) break;
      if (!record[1].includes('"markets"')) continue;
      try {
        visit(JSON.parse(record[1]));
      } catch { }
    }

    embeddedEventCache = { slug, texts, event };
    return event;
  }

  function getSelectedMarket() {
    const event = getEmbeddedEvent();
    if (!event) return null;

    const widget = getActiveTradeWidget();
    const name = widget ? readSelectedMarketName(widget) : null;
    if (name) {
      const named = event.markets.find((item) => normalizeSpaces(item.groupItemTitle) === name)
        || event.markets.find((item) => normalizeSpaces(item.question) === name);
      if (named) return named;
    }

    const marketSlug = getRouteParts()[2];
    return event.markets.find((item) => item.slug === marketSlug) ||
      (event.markets.length === 1 ? event.markets[0] : null);
  }

  function getSelectedMarketEndDate() {
    const market = getSelectedMarket();
    const endDate = market?.endDate ? new Date(market.endDate) : null;
    return isValidDate(endDate) ? endDate : null;
  }

  const resolutionCache = new Map();
  let resolutionRequestsStopped = false;

  function getFetchedResolution(market) {
    const conditionId = market?.conditionId;
    if (!/^0x[\da-f]{64}$/i.test(conditionId || '')) return null;

    let entry = resolutionCache.get(conditionId);
    if (!entry) {
      entry = { checked: false, status: null, lastAttempt: 0, controller: null };
      resolutionCache.set(conditionId, entry);
    }
    if (!resolutionRequestsStopped && !entry.controller && entry.status !== 'resolved' &&
      (!entry.lastAttempt || Date.now() - entry.lastAttempt >= 20000)) {
      entry.lastAttempt = Date.now();
      entry.controller = new AbortController();
      const controller = entry.controller;
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      fetch(`/api/market/resolution/${conditionId}`, {
        credentials: 'omit', signal: controller.signal
      }).then((response) => {
        if (!response.ok) throw new Error('Resolution request failed');
        return response.json();
      }).then((result) => {
        if (result?.conditionId?.toLowerCase() !== conditionId.toLowerCase() ||
          !Object.prototype.hasOwnProperty.call(result, 'data') ||
          (result.data !== null && typeof result.data?.status !== 'string')) {
          throw new Error('Invalid resolution response');
        }
        entry.status = result.data?.status || null;
        entry.checked = true;
      }).catch(() => {
        // Keep the last verified state; an unverified outcome has no APR estimate.
      }).finally(() => {
        clearTimeout(timeoutId);
        entry.controller = null;
        if (!resolutionRequestsStopped) scheduleUpdate();
      });
    }
    return entry;
  }

  function getMarketResolutionState() {
    const market = getSelectedMarket();
    const fetched = getFetchedResolution(market);
    const widget = getActiveTradeWidget();
    const name = (widget ? readSelectedMarketName(widget) : null) ||
      market?.groupItemTitle || market?.question;
    const visibleStatus = getVisibleMarketResolutionStatus(name);
    const status = visibleStatus || fetched?.status || market?.umaResolutionStatus;
    if (market?.closed || fetched?.status === 'resolved' ||
      market?.umaResolutionStatus === 'resolved' || status === 'resolved') {
      return { label: 'Ended', title: 'Market resolved; APR is no longer estimated.' };
    }
    if (status === 'proposed') {
      return { label: 'In Review', title: 'Outcome proposed; awaiting final resolution.' };
    }
    if (status === 'disputed') {
      return { label: 'Disputed', title: 'Outcome disputed; awaiting final resolution.' };
    }
    if (fetched && !fetched.checked) {
      return { label: '--', title: fetched.controller
        ? 'Checking market resolution.' : 'Market resolution could not be verified.' };
    }
    const scheduled = getScheduledAwardDate();
    if (scheduled && scheduled.date.getTime() <= Date.now()) {
      return { label: 'Awaiting result', title: 'Scheduled award date has passed; awaiting a confirmed result.' };
    }
    return null;
  }

  function getVisibleMarketResolutionStatus(name) {
    const scope = document.querySelector('main');
    if (!name || !scope) return null;
    const statuses = { 'In Review': 'proposed', Disputed: 'disputed', Resolved: 'resolved' };
    for (const button of scope.querySelectorAll('button')) {
      const status = statuses[normalizeSpaces(button.textContent)];
      if (!status || !isElementVisible(button)) continue;

      let row = button.parentElement;
      for (let depth = 0; row && depth < 6; depth += 1, row = row.parentElement) {
        const hasTradeButtons = Array.from(row.querySelectorAll('button')).some((item) =>
          /^Buy\s+(?:Yes|No)\b/i.test(normalizeSpaces(item.textContent)));
        if (!hasTradeButtons) continue;
        // Stop at this outcome's row; never borrow a neighboring outcome's status.
        const matchesName = Array.from(row.querySelectorAll('p, span, h3')).some((item) =>
          normalizeSpaces(item.textContent) === name);
        if (matchesName) return status;
        break;
      }
    }
    return null;
  }

  function parseOffsetMinutesFromTzName(tzName) {
    const m = (tzName || '').match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/i);
    if (!m) return 0;

    const hours = parseInt(m[1], 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const sign = hours >= 0 ? 1 : -1;
    return (hours * 60) + (sign * minutes);
  }

  function getTimeZoneOffsetMinutes(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'shortOffset',
    }).formatToParts(date);

    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+0';
    return parseOffsetMinutesFromTzName(tzName);
  }

  function makeDateInTimeZone(year, monthIndex, day, hour, minute, second, timeZone) {
    const baseUtc = Date.UTC(year, monthIndex, day, hour, minute, second);
    let utcMs = baseUtc;

    // Iterate to lock correct offset for the target local date/time.
    for (let i = 0; i < 2; i++) {
      const offsetMin = getTimeZoneOffsetMinutes(new Date(utcMs), timeZone);
      utcMs = baseUtc - (offsetMin * 60000);
    }

    return new Date(utcMs);
  }

  function getCurrentYearInTimeZone(timeZone) {
    try {
      const yearStr = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
      }).format(new Date());
      const year = parseInt(yearStr, 10);
      return Number.isInteger(year) ? year : null;
    } catch {
      return null;
    }
  }

  function getDatePartsInTimeZone(date, timeZone) {
    if (!isValidDate(date) || !timeZone) return null;

    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);

      const year = parseInt(parts.find((p) => p.type === 'year')?.value || '', 10);
      const month = parseInt(parts.find((p) => p.type === 'month')?.value || '', 10);
      const day = parseInt(parts.find((p) => p.type === 'day')?.value || '', 10);

      if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
      return { year, monthIndex: month - 1, day };
    } catch {
      return null;
    }
  }

  function resolveTimeZoneFromText(text) {
    if (!text) return null;

    const normalized = normalizeSpaces(text);
    const ianaMatches = normalized.match(IANA_TZ_RE) || [];
    for (const match of ianaMatches) {
      if (isValidIanaTimeZone(match)) return match;
    }

    for (const alias of TZ_ALIAS) {
      if (alias.re.test(normalized)) return alias.timeZone;
    }

    return null;
  }

  function getRulesText() {
    const activeRulesPanel = document.querySelector('[role="tabpanel"]');
    if (activeRulesPanel) {
      const panelText = normalizeSpaces(activeRulesPanel.textContent || '');
      if (panelText.length >= 80 && RULES_START_RE.test(panelText)) {
        const trimmedPanel = normalizeSpaces(panelText.split(/Market Opened:/i)[0] || panelText);
        if (trimmedPanel) return trimmedPanel;
      }
    }

    const scope = document.querySelector('main') || document.body;
    if (!scope) return null;

    const candidates = [];
    for (const el of scope.querySelectorAll('p, div, span')) {
      const text = normalizeSpaces(el.textContent || '');
      if (text.length < 80) continue;
      if (text.length > 4000) continue;
      if (!RULES_START_RE.test(text)) continue;
      candidates.push(text);
    }

    if (!candidates.length) return null;

    const best = candidates.sort((a, b) => b.length - a.length)[0];
    const trimmed = normalizeSpaces(best.split(/Market Opened:/i)[0] || best);
    return trimmed || null;
  }

  function parseRulesCutoff() {
    const rulesText = getRulesText();
    if (!rulesText) return null;

    let hour = 23;
    let minute = 59;
    let pivotIndex = rulesText.length - 1;

    const explicit = rulesText.match(EXPLICIT_TIME_RE);
    if (explicit) {
      const hour12 = parseInt(explicit[1], 10);
      minute = explicit[2] ? parseInt(explicit[2], 10) : 0;
      const meridiem = explicit[3].toUpperCase();

      if (!Number.isInteger(hour12) || hour12 < 1 || hour12 > 12) return null;
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

      hour = hour12 % 12;
      if (meridiem === 'PM') hour += 12;
      pivotIndex = explicit.index || 0;
    }

    const nearPivot = rulesText.slice(
      Math.max(0, pivotIndex - 120),
      Math.min(rulesText.length, pivotIndex + 120)
    );

    const dateParts = findClosestDatePartsInText(rulesText, pivotIndex);
    // Bind a time to its following zone, before a parenthesized conversion.
    const timeSuffix = explicit
      ? rulesText.slice(pivotIndex + explicit[0].length)
        .match(/^\s*([A-Za-z_]+(?:\/[A-Za-z_]+){1,2}|[A-Za-z]+(?:\s+(?:European\s+)?Time)?)/)?.[1] || ''
      : '';
    const timeZone = resolveTimeZoneFromText(timeSuffix) || resolveTimeZoneFromText(nearPivot) ||
      resolveTimeZoneFromText(rulesText) ||
      (dateParts?.kind === 'scheduled' ? 'UTC' : null);
    if (!timeZone) return null;

    return { timeZone, hour, minute, second: 59, dateParts };
  }

  function findClosestDatePartsInText(text, pivotIndex) {
    if (!text) return null;

    const candidates = [];
    const addCandidates = (regex, kind) => {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text))) {
        const parsed = parseOutcomeMatch(match, kind);
        if (!parsed) continue;

        const center = match.index + Math.floor(match[0].length / 2);
        const distance = Math.abs(center - pivotIndex);
        candidates.push({ parsed, distance, hasYear: !!parsed.year });
      }
    };

    addCandidates(/\bWeek of\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/ig, 'week');
    addCandidates(/\bby\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/ig, 'date');
    addCandidates(SCHEDULED_DATE_RE, 'scheduled');
    addCandidates(/\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/ig, 'date');

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const scoreA = (a.hasYear ? 0 : 1000) + a.distance;
      const scoreB = (b.hasYear ? 0 : 1000) + b.distance;
      return scoreA - scoreB;
    });

    return candidates[0].parsed;
  }

  function parseOutcomeMatch(match, kind) {
    if (!match) return null;

    const monthKey = (match[1] || '').toLowerCase();
    const monthIndex = MONTH_INDEX[monthKey];
    const day = parseInt(match[2], 10);
    const year = match[3] ? parseInt(match[3], 10) : null;

    if (!Number.isInteger(monthIndex)) return null;
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    if (match[3] && (!Number.isInteger(year) || year < 1900 || year > 3000)) return null;

    return { kind, monthIndex, day, year };
  }

  function parseOutcomeLabelExact(text) {
    const normalized = normalizeSpaces(text);
    if (!normalized) return null;

    return parseOutcomeMatch(normalized.match(WEEK_OF_RE), 'week') ||
      parseOutcomeMatch(normalized.match(DATE_LABEL_RE), 'date');
  }

  function parseOutcomeLabelLoose(text) {
    const normalized = normalizeSpaces(text);
    if (!normalized) return null;

    return parseOutcomeMatch(normalized.match(WEEK_OF_FREE_RE), 'week') ||
      parseOutcomeMatch(normalized.match(DATE_FREE_RE), 'date');
  }

  function extractOutcomeDateParts(root) {
    if (!root) return null;

    const nodes = [root, ...root.querySelectorAll('*')];

    for (const node of nodes) {
      const parsed = parseOutcomeLabelExact(node.textContent || '');
      if (parsed) return parsed;
    }

    for (const node of nodes) {
      const text = normalizeSpaces(node.textContent || '');
      if (!text || text.length > 260) continue;

      const parsed = parseOutcomeLabelLoose(text);
      if (parsed) return parsed;
    }

    return null;
  }

  function extractOutcomeDatePartsExact(root) {
    if (!root) return null;

    const nodes = [root, ...root.querySelectorAll('*')];

    for (const node of nodes) {
      const text = normalizeSpaces(node.textContent || '');
      if (!text || text.length > 64) continue;

      const parsed = parseOutcomeLabelExact(text);
      if (parsed) return parsed;
    }

    return null;
  }

  function getActiveOutcomeDateParts() {
    const outcomesOpenRoot = document.querySelector('#outcomes [data-state="open"]');
    const tradeWidgetRoot = getActiveTradeWidget();

    // Prefer the currently selected short label in trade widget.
    const fromTradeWidgetExact = extractOutcomeDatePartsExact(tradeWidgetRoot);
    if (fromTradeWidgetExact) return fromTradeWidgetExact;

    // If outcomes list is available, prefer exact label matching there.
    const fromOutcomesExact = extractOutcomeDatePartsExact(outcomesOpenRoot);
    if (fromOutcomesExact) return fromOutcomesExact;

    // Loose parsing is allowed only in outcomes root, never in the whole trade widget.
    const fromOutcomesLoose = extractOutcomeDateParts(outcomesOpenRoot);
    if (fromOutcomesLoose) return fromOutcomesLoose;

    return null;
  }

  function buildOutcomeEndDate(dateParts, year, cutoff) {
    if (!dateParts || !cutoff) return null;
    if (!isValidCalendarDate(year, dateParts.monthIndex, dateParts.day)) return null;

    if (dateParts.kind === 'week') {
      const mondayUtc = Date.UTC(year, dateParts.monthIndex, dateParts.day, 0, 0, 0);
      const sundayUtc = new Date(mondayUtc + (6 * 86400000));

      return makeDateInTimeZone(
        sundayUtc.getUTCFullYear(),
        sundayUtc.getUTCMonth(),
        sundayUtc.getUTCDate(),
        cutoff.hour,
        cutoff.minute,
        cutoff.second,
        cutoff.timeZone
      );
    }

    return makeDateInTimeZone(
      year,
      dateParts.monthIndex,
      dateParts.day,
      cutoff.hour,
      cutoff.minute,
      cutoff.second,
      cutoff.timeZone
    );
  }

  function getFallbackDateFromRules(startDateIso, eventEndDate) {
    const cutoff = parseRulesCutoff();
    if (!cutoff) return null;

    // Prefer the currently selected outcome label over incidental dates
    // mentioned inside the rules text (examples, market-opened timestamps).
    const activeDateParts = getActiveOutcomeDateParts();
    const dateParts = activeDateParts || cutoff.dateParts;
    if (!dateParts) return null;

    const startDate = startDateIso ? new Date(startDateIso) : null;
    const endDateHint = isValidDate(eventEndDate) ? eventEndDate : null;
    const safeStartDate = isValidDate(startDate) ? startDate : null;
    let utcMonthMatch = false;
    let utcDayMatch = false;
    let tzParts = null;
    let tzMonthMatch = false;
    let tzDayMatch = false;

    if (endDateHint) {
      utcMonthMatch = endDateHint.getUTCMonth() === dateParts.monthIndex;
      utcDayMatch = endDateHint.getUTCDate() === dateParts.day;
      tzParts = getDatePartsInTimeZone(endDateHint, cutoff.timeZone);
      tzMonthMatch = tzParts?.monthIndex === dateParts.monthIndex;
      tzDayMatch = tzParts?.day === dateParts.day;

      if (!activeDateParts && !((utcMonthMatch && utcDayMatch) || (tzMonthMatch && tzDayMatch))) {
        return null;
      }
    }

    let year = dateParts.year ||
      (safeStartDate ? safeStartDate.getUTCFullYear() : getCurrentYearInTimeZone(cutoff.timeZone));

    if (!dateParts.year && endDateHint) {
      if (utcMonthMatch && utcDayMatch) {
        year = endDateHint.getUTCFullYear();
      } else if (tzMonthMatch && tzDayMatch && Number.isInteger(tzParts.year)) {
        year = tzParts.year;
      }
    }

    if (!Number.isInteger(year)) return null;

    let endDate = buildOutcomeEndDate(dateParts, year, cutoff);
    if (!isValidDate(endDate)) return null;

    const referenceDate = dateParts.kind === 'scheduled'
      ? new Date(Math.max(safeStartDate?.getTime() || 0, Date.now()))
      : safeStartDate;
    if (!dateParts.year && referenceDate && endDate.getTime() < referenceDate.getTime()) {
      year += 1;
      endDate = buildOutcomeEndDate(dateParts, year, cutoff);
      if (!isValidDate(endDate)) return null;
    }

    return endDate;
  }

  function getSmartDate() {
    const scheduled = getScheduledAwardDate();
    if (scheduled) return scheduled.date;
    const eventData = getEventJsonLd();
    // An event can contain outcomes ending earlier than its overall deadline.
    const eventEndDate = getSelectedMarketEndDate() ||
      (eventData?.endDate ? new Date(eventData.endDate) : null);

    const fallbackDate = getFallbackDateFromRules(eventData?.startDate || null, eventEndDate);
    if (isValidDate(fallbackDate)) return fallbackDate;

    if (isValidDate(eventEndDate)) {
      return eventEndDate;
    }

    const visibleExpiryDate = getVisibleExpiryDate();
    if (isValidDate(visibleExpiryDate)) return visibleExpiryDate;

    return null;
  }

  function getScheduledAwardDate() {
    const rules = normalizeSpaces(getSelectedMarket()?.description || getRulesText());
    // A ceremony date is an estimate, distinct from a conditional no-winner deadline.
    if (!/\b(?:award|prize|grammy|oscar)\b/i.test(rules) ||
      !/\b(?:wins?|laureate|winner)\b/i.test(rules) ||
      !/\bIf\b[^.]{0,350}\b(?:no winner|not been announced|no official announcement|award has not)[^.]{0,150}\bby\b/i.test(rules)) {
      return null;
    }
    const datePattern = '([A-Za-z]+)\\s+(\\d{1,2}),\\s*(\\d{4})';
    const match = rules.match(new RegExp('\\bceremony\\s+(?:on|for)\\s+' + datePattern, 'i')) ||
      rules.match(new RegExp('\\bscheduled\\s+to\\s+be\\s+(?:presented|held|awarded|announced)\\s+(?:on|for)\\s+' + datePattern, 'i'));
    if (!match) return null;
    const parts = parseOutcomeMatch(match, 'scheduled');
    if (!parts || !isValidCalendarDate(parts.year, parts.monthIndex, parts.day)) return null;

    const suffix = rules.slice(match.index + match[0].length);
    const time = suffix.match(/^,?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s+([A-Za-z_/]+)/i);
    const timeZone = time ? resolveTimeZoneFromText(time[4]) : null;
    if (time && timeZone) {
      const hour12 = Number(time[1]);
      const minute = Number(time[2] || 0);
      if (hour12 < 1 || hour12 > 12 || minute > 59) return null;
      const hour = hour12 % 12 + (time[3].toUpperCase() === 'PM' ? 12 : 0);
      return { date: makeDateInTimeZone(parts.year, parts.monthIndex, parts.day, hour, minute, 0, timeZone), hasTime: true };
    }
    // With only a calendar date, estimate through that day and show no invented time.
    return { date: new Date(Date.UTC(parts.year, parts.monthIndex, parts.day, 23, 59, 59)), hasTime: false };
  }

  function getVisibleExpiryDate() {
    const scope = document.querySelector('main') || document.body;
    const text = normalizeSpaces(scope?.textContent || '');
    const match = text.match(/\bExpires\s+(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\b/i);
    if (!match) return null;

    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const durationMs = ((days * 24 + hours) * 60 + minutes) * 60000;
    return durationMs > 0 ? new Date(Date.now() + durationMs) : null;
  }

  function createWidget() {
    const container = document.createElement('div');
    container.id = 'poly-custom-apr';
    container.className = 'poly-apr-row';

    const clip = document.createElement('div');
    clip.className = 'poly-apr-clip';

    const body = document.createElement('div');
    body.className = 'poly-apr-body';

    const label = document.createElement('p');
    label.className = 'text-text-primary text-base leading-5 font-medium';
    label.textContent = 'Est. APR';

    const right = document.createElement('div');
    right.className = 'flex items-center gap-1.5';

    const valSpan = document.createElement('span');
    valSpan.className = CLASS_INACTIVE;

    const timeSpan = document.createElement('span');
    timeSpan.className =
      'text-neutral-500 text-[20px] leading-6 font-medium underline decoration-dotted underline-offset-4 poly-apr-time';

    right.appendChild(valSpan);
    right.appendChild(timeSpan);
    body.appendChild(label);
    body.appendChild(right);
    clip.appendChild(body);
    container.appendChild(clip);

    state.dom = { container, valSpan, timeSpan };
    state.lastColorMode = 'inactive';
  }

  function ensureInserted(widget) {
    if (!state.dom.container) createWidget();
    removeDuplicateAprRows();

    const orderType = getOrderType(widget);
    if (orderType === 'limit') {
      const anchor = pickVisibleAnchor(widget, LIMIT_ANCHOR_SELECTOR);
      if (!anchor) return false;
      if (state.dom.container.previousElementSibling === anchor) return true;
      anchor.insertAdjacentElement('afterend', state.dom.container);
      return true;
    }

    if (orderType === 'market') {
      const structuredAnchor = pickVisibleAnchor(widget, MARKET_ANCHOR_SELECTOR);
      const tradeButton = pickVisibleAnchor(widget, MARKET_BUTTON_SELECTOR);
      const anchor = structuredAnchor || tradeButton?.closest('.flex.flex-col.gap-2.w-full');
      if (!anchor) return false;
      if (state.dom.container.nextElementSibling === anchor) return true;
      anchor.insertAdjacentElement('beforebegin', state.dom.container);
      return true;
    }

    // A brief unknown mode must not freeze a row that is already on screen.
    return !!(state.dom.container.isConnected && widget.contains(state.dom.container));
  }

  function parseCents(text) {
    const match = (text || '').match(CENTS_PATTERN);
    if (!match) return null;

    const value = parseFloat(match[1].replace(',', '.'));
    return isFinite(value) ? value : null;
  }

  function readOutcomePrice(widget) {
    const candidates = widget.querySelectorAll(
      '#outcome-buttons [data-state="checked"], ' +
      '#outcome-buttons [role="radio"][aria-checked="true"], ' +
      '.trading-button[data-state="checked"], ' +
      '.trading-button[aria-checked="true"], ' +
      'button[value="YES"][data-state="checked"], button[value="NO"][data-state="checked"], ' +
      'button[value="YES"][aria-checked="true"], button[value="NO"][aria-checked="true"]'
    );

    let fallbackParsed = null;
    let selectedSideText = null;
    let selectedSide = null;

    // React transitions can keep stale checked radios in the DOM briefly.
    // Prefer only visible checked outcomes to avoid reading stale prices.
    for (const candidate of candidates) {
      if (!selectedSideText && isElementVisible(candidate)) {
        selectedSideText = normalizeSpaces(candidate.textContent || '');
        const value = controlValue(candidate);
        if (value === 'YES' || value === 'NO') selectedSide = value.toLowerCase();
        else if (/^(?:yes|no)$/i.test(selectedSideText)) selectedSide = selectedSideText.toLowerCase();
      }

      const parsed = parseCents(candidate.innerText || candidate.textContent || '');
      if (parsed === null) continue;

      if (fallbackParsed === null) fallbackParsed = parsed;

      if (!isElementVisible(candidate)) continue;

      state.lastOutcomePrice = parsed;
      return parsed;
    }

    if (!selectedSide) {
      const yes = findCheckedValue(widget, 'YES');
      const no = findCheckedValue(widget, 'NO');
      if (yes && isElementVisible(yes)) selectedSide = 'yes';
      else if (no && isElementVisible(no)) selectedSide = 'no';
    }

    const externalParsed = readExternalOutcomePrice(widget, selectedSide || selectedSideText);
    if (externalParsed !== null) {
      state.lastOutcomePrice = externalParsed;
      return externalParsed;
    }

    const embeddedParsed = readEmbeddedOutcomePrice(selectedSide || selectedSideText);
    if (embeddedParsed !== null) {
      state.lastOutcomePrice = embeddedParsed;
      return embeddedParsed;
    }

    if (isFinite(state.lastOutcomePrice)) return state.lastOutcomePrice;

    if (fallbackParsed !== null) {
      state.lastOutcomePrice = fallbackParsed;
      return fallbackParsed;
    }

    return 0;
  }

  function readPrice(widget) {
    const orderType = getOrderType(widget);

    // In Market mode the decimal input is amount ($), not price (cents).
    if (orderType === 'market') {
      return readOutcomePrice(widget);
    }

    const input = widget.querySelector('input[inputmode="decimal"]');
    if (input?.value) {
      const value = parseFloat(input.value);
      if (isFinite(value)) return value;
    }

    return readOutcomePrice(widget);
  }

  function setValColor(mode) {
    if (!state.dom.valSpan) return;
    if (state.lastColorMode === mode) return;

    state.dom.valSpan.classList.remove(...CLASS_ACTIVE.split(' '));
    state.dom.valSpan.classList.remove(...CLASS_INACTIVE.split(' '));
    state.dom.valSpan.classList.add(...(mode === 'active' ? CLASS_ACTIVE : CLASS_INACTIVE).split(' '));
    state.lastColorMode = mode;
  }

  function update() {
    const widget = getActiveTradeWidget();
    if (!widget) return;

    const buyActive = isBuyActive(widget);
    if (state.lastBuyActive !== null && state.lastBuyActive !== buyActive) {
      if (buyActive) {
        armSideSwitchSettle();
      } else {
        state.lastOutcomePrice = null;
      }
    }
    state.lastBuyActive = buyActive;

    if (!buyActive) {
      setRowHidden(true);
      return;
    }

    const orderType = getOrderType(widget);
    if (orderType === 'market') {
      const marketLabel = readWidgetMarketLabel(widget);
      if (marketLabel && state.lastMarketLabel && state.lastMarketLabel !== marketLabel) {
        armMarketSwitchSettle();
      }
      state.lastMarketLabel = marketLabel || state.lastMarketLabel;
    } else {
      state.lastMarketLabel = null;
    }

    if (shouldWaitForMarketSwitchSettle(orderType)) {
      if (state.dom.container && widget.contains(state.dom.container)) setRowHidden(false);
      return;
    }

    if (!ensureInserted(widget)) return;
    // Keep the row in the Buy layout while the price settles, so it does not pop in late.
    setRowHidden(false);

    if (shouldWaitForSideSwitchSettle(true)) return;

    const resolution = getMarketResolutionState();
    const price = resolution ? null : readPrice(widget);
    const scheduled = resolution ? null : getScheduledAwardDate();
    const endDate = resolution ? null : getSmartDate();
    const inputKey = `${orderType || 'unknown'}|${resolution?.label || ''}|${price}|${endDate ? endDate.getTime() : 'na'}`;

    if (shouldDeferRender(inputKey)) return;

    let aprText = resolution?.label || '--';
    let timeText = '';
    let tooltipText = '';

    if (price > 0 && price < 100 && endDate) {
      const now = new Date();
      const days = (endDate - now) / 86400000;

      tooltipText = scheduled && !scheduled.hasTime
        ? `Expected: ${endDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
        : `${scheduled ? 'Expected' : 'Resolves'}: ${endDate.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;

      if (days > 0) {
        const roi = ((100 - price) / price) * 100;
        const apr = (roi / days) * 365;
        aprText = formatSmartAPR(apr);

        if (days >= 1) timeText = Math.floor(days) + 'D';
        else if (days * 24 >= 1) timeText = Math.floor(days * 24) + 'h';
        else timeText = '<1h';
      } else {
        aprText = 'Ended';
      }
    }

    const mode = resolution || aprText === 'Ended' || aprText === '--' ? 'inactive' : 'active';
    setValColor(mode);

    state.dom.valSpan.title = resolution?.title || '';
    state.dom.timeSpan.title = tooltipText;

    if (state.lastAprText !== aprText) {
      state.dom.valSpan.textContent = aprText;
      bump(state.dom.valSpan);
      state.lastAprText = aprText;
    }

    if (state.lastTime !== timeText) {
      state.dom.timeSpan.textContent = timeText;
      state.lastTime = timeText;
    }
  }

  const obs = new MutationObserver(() => scheduleUpdate());
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-state', 'aria-checked', 'value', 'class']
  });

  const onAnyWidgetInteraction = (event) => {
    if (!event.target || !event.target.closest) return;
    if (event.target.closest('#trade-widget')) scheduleUpdate();
  };

  const onExternalMarketSwitchClick = (event) => {
    if (!isExternalMarketSwitchTrigger(event.target)) return;
    armMarketSwitchSettle();
  };

  document.addEventListener('click', onAnyWidgetInteraction, true);
  document.addEventListener('click', onExternalMarketSwitchClick, true);
  document.addEventListener('input', onAnyWidgetInteraction, true);
  document.addEventListener('change', onAnyWidgetInteraction, true);

  const intervalId = setInterval(scheduleUpdate, 20000);

  runtime.destroy = () => {
    resolutionRequestsStopped = true;
    for (const entry of resolutionCache.values()) entry.controller?.abort();
    try {
      obs.disconnect();
    } catch {
      // Ignore disconnect errors.
    }
    document.removeEventListener('click', onAnyWidgetInteraction, true);
    document.removeEventListener('click', onExternalMarketSwitchClick, true);
    document.removeEventListener('input', onAnyWidgetInteraction, true);
    document.removeEventListener('change', onAnyWidgetInteraction, true);
    clearInterval(intervalId);
    if (state.settleTimerId) clearTimeout(state.settleTimerId);
    if (state.dom.container && state.dom.container.isConnected) state.dom.container.remove();
  };

  scheduleUpdate();
})();
