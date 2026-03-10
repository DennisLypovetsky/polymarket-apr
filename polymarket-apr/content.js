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
  const WEEK_OF_RE = /^Week of\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i;
  const DATE_LABEL_RE = /^(?:by\s+)?([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/i;
  const WEEK_OF_FREE_RE = /\bWeek of\s+([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/i;
  const DATE_FREE_RE = /\b(?:by\s+)?([A-Za-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?\b/i;
  const IANA_TZ_RE = /\b([A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)\b/g;
  const RULES_START_RE = /^This market will resolve/i;
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
    { re: /\bEastern European Time\b/i, timeZone: 'Europe/Kyiv' },
    { re: /\bEEST\b/i, timeZone: 'Europe/Kyiv' },
    { re: /\bEET\b/i, timeZone: 'Europe/Kyiv' },
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
    const scope = document.querySelector('main') || document.body;
    if (!scope) return null;

    const candidates = [];
    for (const el of scope.querySelectorAll('p, div, span')) {
      const text = normalizeSpaces(el.textContent || '');
      if (text.length < 80) continue;
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

    const explicit = rulesText.match(EXPLICIT_TIME_RE);
    if (explicit) {
      const hour12 = parseInt(explicit[1], 10);
      const minute = explicit[2] ? parseInt(explicit[2], 10) : 0;
      const meridiem = explicit[3].toUpperCase();

      if (!Number.isInteger(hour12) || hour12 < 1 || hour12 > 12) return null;
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

      let hour = hour12 % 12;
      if (meridiem === 'PM') hour += 12;

      const idx = explicit.index || 0;
      const nearTime = rulesText.slice(
        Math.max(0, idx - 24),
        Math.min(rulesText.length, idx + explicit[0].length + 100)
      );

      const timeZone = resolveTimeZoneFromText(nearTime) || resolveTimeZoneFromText(rulesText);
      if (!timeZone) return null;

      return { timeZone, hour, minute, second: 59 };
    }

    const timeZone = resolveTimeZoneFromText(rulesText);
    if (!timeZone) return null;

    return { timeZone, hour: 23, minute: 59, second: 59 };
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

  function getActiveOutcomeDateParts() {
    const fromOutcomesList = extractOutcomeDateParts(
      document.querySelector('#outcomes [data-state="open"]')
    );
    if (fromOutcomesList) return fromOutcomesList;

    // Newer DOM may not expose #outcomes[data-state="open"]; selected outcome
    // label still exists inside trade widget.
    const fromTradeWidget = extractOutcomeDateParts(
      document.querySelector('#trade-widget')
    );
    if (fromTradeWidget) return fromTradeWidget;

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

  function getFallbackDateFromRules(startDateIso) {
    const cutoff = parseRulesCutoff();
    if (!cutoff) return null;

    const dateParts = getActiveOutcomeDateParts();
    if (!dateParts) return null;

    const startDate = startDateIso ? new Date(startDateIso) : null;
    const safeStartDate = isValidDate(startDate) ? startDate : null;
    let year = dateParts.year ||
      (safeStartDate ? safeStartDate.getUTCFullYear() : getCurrentYearInTimeZone(cutoff.timeZone));

    if (!Number.isInteger(year)) return null;

    let endDate = buildOutcomeEndDate(dateParts, year, cutoff);
    if (!isValidDate(endDate)) return null;

    if (!dateParts.year && safeStartDate && endDate.getTime() < safeStartDate.getTime()) {
      year += 1;
      endDate = buildOutcomeEndDate(dateParts, year, cutoff);
      if (!isValidDate(endDate)) return null;
    }

    return endDate;
  }

  function getSmartDate() {
    const eventData = getEventJsonLd();

    if (eventData?.endDate) {
      const endDate = new Date(eventData.endDate);
      if (isValidDate(endDate)) return endDate;
    }

    const fallbackDate = getFallbackDateFromRules(eventData?.startDate || null);
    if (isValidDate(fallbackDate)) return fallbackDate;

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

  function ensureInserted(widget) {
    if (!state.dom.container) createWidget();

    const anchor = widget.querySelector('.limit-trade-info');
    if (!anchor) return false;

    if (state.dom.container.previousElementSibling === anchor) return true;
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
