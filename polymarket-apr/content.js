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

  const STYLE_ID = 'poly-apr-styles-v18';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .poly-apr-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 8px;
        margin-top: 8px;
        border-top: 1px dashed var(--color-border, rgba(255,255,255,0.1));
      }

      @keyframes polyFadeSlide {
        0% { opacity: 0; transform: translateY(4px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      .poly-anim-enter {
        animation: polyFadeSlide 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .poly-apr-time { cursor: help; }
    `;
    document.head.appendChild(style);
  }

  const CLASS_ACTIVE = 'text-green-600 dark:text-green-500 text-[20px] leading-6 font-medium';
  const CLASS_INACTIVE = 'text-neutral-500 text-[20px] leading-6 font-medium';

  const LIMIT_ANCHOR_SELECTOR = '.limit-trade-info';
  const MARKET_ANCHOR_SELECTOR = '.flex.flex-col.gap-4 > .flex.flex-1';
  const CENTS_PATTERN = /(\d+(?:[.,]\d+)?)\s*\u00A2/;

  const state = {
    dom: { container: null, valSpan: null, timeSpan: null },
    lastAprText: null,
    lastTime: null,
    lastColorMode: null,
    scheduled: false
  };

  function isBuyActive(widget) {
    if (widget.querySelector('button[value="BUY"][data-state="checked"]')) return true;

    const checkedSide = widget.querySelector('[role="radiogroup"] [role="radio"][aria-checked="true"]');
    return /\bbuy\b/i.test(checkedSide?.textContent || '');
  }

  function getOrderType(widget) {
    if (widget.querySelector('button[value="LIMIT"][data-state="checked"]')) return 'limit';
    if (widget.querySelector('button[value="MARKET"][data-state="checked"]')) return 'market';

    const sideSelectionBtn = widget.querySelector('button[aria-label="side selection"]');
    const sideText = (sideSelectionBtn?.textContent || '').trim().toLowerCase();

    if (sideText.includes('limit')) return 'limit';
    if (sideText.includes('market')) return 'market';
    return null;
  }

  function isElementVisible(el) {
    return !!(el && (el.offsetParent || el.getClientRects().length));
  }

  function pickVisibleAnchor(widget, selector) {
    const anchors = widget.querySelectorAll(selector);
    for (const anchor of anchors) {
      if (isElementVisible(anchor)) return anchor;
    }
    return null;
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

  function scheduleUpdate() {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(() => {
      state.scheduled = false;
      update();
    });
  }

  function getSmartDate() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        if (data?.endDate) return new Date(data.endDate);
      } catch {
        // Skip malformed JSON-LD blocks.
      }
    }
    return null;
  }

  function createWidget() {
    const container = document.createElement('div');
    container.id = 'poly-custom-apr';
    container.className = 'poly-apr-row';

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
    container.appendChild(label);
    container.appendChild(right);

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
      const anchor = pickVisibleAnchor(widget, MARKET_ANCHOR_SELECTOR);
      if (!anchor) return false;
      if (state.dom.container.nextElementSibling === anchor) return true;
      anchor.insertAdjacentElement('beforebegin', state.dom.container);
      return true;
    }

    return false;
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
      '[role="radiogroup"] [role="radio"][aria-checked="true"]'
    );

    for (const candidate of candidates) {
      const parsed = parseCents(candidate.innerText || candidate.textContent || '');
      if (parsed !== null) return parsed;
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
    const widget = document.getElementById('trade-widget');
    if (!widget) return;

    if (!isBuyActive(widget)) {
      if (state.dom.container) state.dom.container.style.display = 'none';
      return;
    }

    if (!ensureInserted(widget)) return;
    state.dom.container.style.display = 'flex';

    const price = readPrice(widget);
    const endDate = getSmartDate();

    let aprText = '--';
    let timeText = '';
    let tooltipText = '';

    if (price > 0 && price < 100 && endDate) {
      const now = new Date();
      const days = (endDate - now) / 86400000;

      tooltipText = `Resolves: ${endDate.toLocaleString([], {
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

    const mode = aprText === 'Ended' || aprText === '--' ? 'inactive' : 'active';
    setValColor(mode);

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

  document.addEventListener('click', onAnyWidgetInteraction, true);
  document.addEventListener('input', onAnyWidgetInteraction, true);
  document.addEventListener('change', onAnyWidgetInteraction, true);

  const intervalId = setInterval(scheduleUpdate, 20000);

  runtime.destroy = () => {
    try {
      obs.disconnect();
    } catch {
      // Ignore disconnect errors.
    }
    document.removeEventListener('click', onAnyWidgetInteraction, true);
    document.removeEventListener('input', onAnyWidgetInteraction, true);
    document.removeEventListener('change', onAnyWidgetInteraction, true);
    clearInterval(intervalId);
    if (state.dom.container && state.dom.container.isConnected) state.dom.container.remove();
  };

  scheduleUpdate();
})();
