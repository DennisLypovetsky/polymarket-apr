// ==UserScript==
// @name         Polymarket APR Dev
// @namespace    https://github.com/DennisLypovetsky/polymarket-apr
// @version      1.2.0-dev
// @description  Fast visual iteration script for Polymarket APR
// @match        https://polymarket.com/*
// @grant        none
// ==/UserScript==

// NOTE:
// Source of truth is polymarket-apr/content.js.
// Use this file for fast visual iteration, then move accepted changes back.
(function () {
  'use strict';

  // ---------- STYLES (v44) ----------
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
        0%   { opacity: 0; transform: translateY(4px); }
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

  const state = {
    dom: { container: null, valSpan: null, timeSpan: null },
    lastAprText: null,
    lastTime: null,
    lastColorMode: null, // 'active' | 'inactive'
    scheduled: false,
  };

  // ---------- HELPERS ----------
  function isBuyActive(widget) {
    return !!widget.querySelector('button[value="BUY"][data-state="checked"]');
  }

  function formatSmartAPR(apr) {
    if (!isFinite(apr)) return '∞';
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

  // ---------- DATE ----------
  function getSmartDate() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || '');
        if (data?.endDate) return new Date(data.endDate);
      } catch { }
    }
    return null;
  }

  // ---------- UI ----------
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
    // базовый класс ставим один раз; дальше не перезатираем className
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

  function findInsertAnchor(widget) {
    // Old UI used .limit-trade-info. Current UI keeps a dashed separator
    // above the related markets list inside the trade widget.
    const selectors = [
      '.limit-trade-info',
      '.border-dashed',
    ];

    for (const selector of selectors) {
      const el = widget.querySelector(selector);
      if (el) return el;
    }

    return null;
  }

  function ensureInserted(widget) {
    if (!state.dom.container) createWidget();

    const anchor = findInsertAnchor(widget);
    if (!anchor) return false;

    if (
      state.dom.container.previousElementSibling === anchor &&
      state.dom.container.parentElement === anchor.parentElement
    ) {
      return true;
    }

    anchor.insertAdjacentElement('afterend', state.dom.container);
    return true;
  }

  function readPrice(widget) {
    const input = widget.querySelector('input[inputmode="decimal"]');
    if (input?.value) {
      const v = parseFloat(input.value);
      if (isFinite(v)) return v;
    }

    const checked = widget.querySelector('#outcome-buttons button[data-state="checked"]');
    if (checked) {
      const m = (checked.innerText || '').match(/(\d+(?:\.\d+)?)\s*¢/);
      if (m) return parseFloat(m[1]);
    }

    return 0;
  }

  function setValColor(mode) {
    if (!state.dom.valSpan) return;
    if (state.lastColorMode === mode) return;

    // убираем оба набора классов, добавляем нужный — НЕ трогаем poly-anim-enter
    state.dom.valSpan.classList.remove(...CLASS_ACTIVE.split(' '));
    state.dom.valSpan.classList.remove(...CLASS_INACTIVE.split(' '));
    state.dom.valSpan.classList.add(...(mode === 'active' ? CLASS_ACTIVE : CLASS_INACTIVE).split(' '));

    state.lastColorMode = mode;
  }

  // ---------- UPDATE ----------
  function update() {
    const widget = document.getElementById('trade-widget');
    if (!widget) return;

    // hide on SELL
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
        minute: '2-digit',
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

    // COLOR (без перетирания className)
    const mode = (aprText === 'Ended' || aprText === '--') ? 'inactive' : 'active';
    setValColor(mode);

    // tooltip
    state.dom.timeSpan.title = tooltipText;

    // ANIMATION ON CHANGE
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

  // ---------- OBSERVER + 20s FALLBACK ----------
  const obs = new MutationObserver(() => scheduleUpdate());
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  setInterval(scheduleUpdate, 20000);

  scheduleUpdate();
})();
