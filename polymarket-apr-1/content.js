(function () {
  'use strict';

  // --- STYLES ---
  const STYLE_ID = 'poly-apr-styles-final';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.innerHTML = `
            .poly-apr-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: 8px;
                margin-top: 8px;
                border-top: 1px dashed var(--color-border, rgba(255,255,255,0.1));
            }
            @keyframes polyFadeSlide {
                0% { opacity: 0; transform: translateY(3px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .poly-anim-enter {
                animation: polyFadeSlide 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
            .poly-apr-time {
                cursor: help;
            }
        `;
    document.head.appendChild(style);
  }

  const state = {
    lastPrice: null,
    lastApr: null,
    lastTime: null,
    lastColorMode: null,
    dom: {
      container: null,
      valSpan: null,
      timeSpan: null
    }
  };

  // --- SMART FORMATTER ---

  function formatSmartAPR(apr) {
    if (!isFinite(apr)) return "∞";
    if (apr < 0) return "0%";

    // 0 - 9.9%: один знак
    if (apr < 10) {
      return apr.toFixed(1) + "%";
    }

    // 10 - 999%: целое число
    if (apr < 1000) {
      return Math.round(apr).toLocaleString() + "%";
    }

    // 1,000 - 9,999%: тысячи с запятой
    if (apr < 10000) {
      return (apr / 1000).toFixed(1) + "k%";
    }

    // 10,000 - 99,999%: десятки тысяч
    if (apr < 100000) {
      return Math.round(apr / 1000).toLocaleString() + "k%";
    }

    // 100,000 - 999,999%: округляем до сотен тысяч
    if (apr < 1000000) {
      return (Math.round(apr / 100000) * 100).toLocaleString() + "k%";
    }

    return ">1M%";
  }

  // --- PARSERS ---

  function parseDateToET(dateStr, timeStr = null) {
    if (!dateStr) return null;
    let cleanDate = dateStr.replace(/,/g, '').trim();

    const hasYear = /\d{4}/.test(cleanDate);
    const currentYear = new Date().getFullYear();

    if (!hasYear) {
      cleanDate = `${cleanDate}, ${currentYear}`;
    }

    let fullStr;
    if (timeStr) {
      fullStr = `${cleanDate} ${timeStr} GMT-0500`;
    } else if (/\d{1,2}:\d{2}/.test(cleanDate)) {
      fullStr = `${cleanDate} GMT-0500`;
    } else {
      fullStr = `${cleanDate} 23:59:59 GMT-0500`;
    }

    let d = new Date(fullStr);
    if (isNaN(d.getTime())) return null;

    if (!hasYear) {
      const now = Date.now();
      if (d.getTime() < now - 86400000) {
        d.setFullYear(currentYear + 1);
      }
    }
    return d;
  }

  function findTimeInRules() {
    const rulesBlock = document.querySelector('.inline-block.w-full.relative.text-sm.break-words');
    if (!rulesBlock) return null;
    const text = rulesBlock.innerText;
    const timeRegex = /((?:1[0-2]|0?[1-9])(?::\d{2}){1,2}\s*[aApP][mM])(?=.*?(?:ET|EST|close|Close))/g;
    const matches = [...text.matchAll(timeRegex)];
    if (matches.length > 0) return matches[matches.length - 1][1];
    return null;
  }

  function getWidgetHeaderDateString(widget) {
    const headerElements = widget.querySelectorAll('span, div');
    const datePattern = /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i;

    for (let el of headerElements) {
      if (el.innerText.length < 5 || el.innerText.length > 50) continue;
      const match = el.innerText.trim().match(datePattern);
      if (match) {
        return match[0];
      }
    }
    return null;
  }

  function getJsonDate() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (let script of scripts) {
        const data = JSON.parse(script.innerText);
        if (data['@type'] === 'Event' && data.endDate) {
          return new Date(data.endDate);
        }
      }
    } catch (e) { }
    return null;
  }

  function getRulesDate() {
    const rulesBlock = document.querySelector('.inline-block.w-full.relative.text-sm.break-words');
    if (!rulesBlock) return null;
    const text = rulesBlock.innerText;
    const matches = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/gi);
    if (matches) {
      const now = Date.now();
      for (let str of matches) {
        let d = parseDateToET(str);
        if (d && d.getTime() > now - 86400000) return d;
      }
    }
    return null;
  }

  // --- MAIN LOGIC ---

  function getSmartDate() {
    const widget = document.getElementById('trade-widget');
    if (!widget) return null;

    const widgetDateStr = getWidgetHeaderDateString(widget);
    const rulesTime = findTimeInRules();

    if (widgetDateStr) {
      if (rulesTime) {
        return parseDateToET(widgetDateStr, rulesTime);
      }
      return parseDateToET(widgetDateStr);
    }

    const jsonDate = getJsonDate();
    if (jsonDate) return jsonDate;

    return getRulesDate();
  }

  // --- UI ---

  function createWidget() {
    const container = document.createElement('div');
    container.id = 'poly-custom-apr';
    container.className = 'poly-apr-row';

    const label = document.createElement('p');
    label.className = "text-text-primary text-base leading-5 font-medium";
    label.textContent = "Est. APR";

    const rightGroup = document.createElement('div');
    rightGroup.className = "flex items-center gap-1.5";

    const valSpan = document.createElement('span');

    const timeSpan = document.createElement('span');
    timeSpan.className = "text-neutral-500 text-[20px] leading-6 font-medium underline decoration-dotted underline-offset-4 poly-apr-time";

    rightGroup.appendChild(valSpan);
    rightGroup.appendChild(timeSpan);

    container.appendChild(label);
    container.appendChild(rightGroup);

    state.dom.container = container;
    state.dom.valSpan = valSpan;
    state.dom.timeSpan = timeSpan;

    return container;
  }

  function update() {
    const widget = document.getElementById('trade-widget');
    if (!widget) return;

    const inputs = widget.querySelectorAll('input[inputmode="decimal"]');
    let price = 0;
    if (inputs[0] && inputs[0].value) {
      price = parseFloat(inputs[0].value);
    }
    if (!price || isNaN(price)) {
      const activeBtn = widget.querySelector('button[data-state="checked"] span.text-base');
      if (activeBtn) {
        price = parseFloat(activeBtn.innerText.replace(/[^\d.]/g, ''));
      }
    }

    let container = document.getElementById('poly-custom-apr');
    if (!container) {
      if (!state.dom.container) {
        createWidget();
      }
      container = state.dom.container;

      const paragraphs = Array.from(widget.querySelectorAll('p'));
      const toWinEl = paragraphs.find(p => p.innerText.includes('To Win'));

      if (toWinEl) {
        const rowContainer = toWinEl.closest('.flex.justify-between');
        if (rowContainer && rowContainer.parentNode) {
          rowContainer.parentNode.insertBefore(container, rowContainer.nextSibling);
        }
      } else {
        return;
      }
    }

    let aprStr = "--";
    let timeStr = "";
    let showWidget = true;
    let tooltipText = "";
    let isEnded = false;

    const endDate = getSmartDate();

    if (!price || price <= 0 || price >= 100) {
      // waiting
    } else if (!endDate) {
      showWidget = false;
    } else {
      const now = new Date();
      const diffTime = endDate - now;
      const daysLeft = diffTime / (1000 * 60 * 60 * 24);

      tooltipText = `Resolves: ${endDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;

      if (daysLeft <= 0) {
        aprStr = "Ended";
        timeStr = "";
        isEnded = true;
      } else {
        const roi = ((100 - price) / price) * 100;
        const apr = (roi / daysLeft) * 365;
        aprStr = formatSmartAPR(apr);

        if (daysLeft >= 1) {
          timeStr = Math.floor(daysLeft) + "D";
        } else if (daysLeft * 24 >= 1) {
          timeStr = Math.floor(daysLeft * 24) + "h";
        } else {
          timeStr = "<1h";
        }
      }
    }

    if (!showWidget) {
      state.dom.container.style.display = 'none';
      return;
    }
    state.dom.container.style.display = 'flex';

    if (state.dom.timeSpan.title !== tooltipText) {
      state.dom.timeSpan.title = tooltipText;
    }

    const colorClassActive = "text-green-600 dark:text-green-500 text-[20px] leading-6 font-medium";
    const colorClassInactive = "text-neutral-500 text-[20px] leading-6 font-medium";
    let targetClass = (isEnded || aprStr === "--") ? colorClassInactive : colorClassActive;

    if (state.dom.valSpan.className !== targetClass) {
      state.dom.valSpan.className = targetClass;
    }

    if (state.lastApr !== aprStr) {
      state.dom.valSpan.textContent = aprStr;
      state.dom.valSpan.classList.remove('poly-anim-enter');
      void state.dom.valSpan.offsetWidth;
      state.dom.valSpan.classList.add('poly-anim-enter');
      state.lastApr = aprStr;
    }

    if (state.lastTime !== timeStr) {
      state.dom.timeSpan.textContent = timeStr;
      state.lastTime = timeStr;
    }

    state.lastPrice = price;
  }

  setInterval(update, 500);

})();