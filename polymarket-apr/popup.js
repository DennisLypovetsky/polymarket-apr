import {
  RELEASES_URL,
  checkForUpdates,
  compareVersions,
  currentVersion,
  getState,
  isUpdateAvailable,
  isUpdatePending,
  refreshIndicator,
  skipVersion,
} from './updates.js';

const content = document.getElementById('content');
document.getElementById('installed').textContent = `v${currentVersion()}`;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function stripInlineMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .trim();
}

// Renders release notes as plain text blocks: paragraphs and bullet lists only.
function renderNotes(markdown) {
  const container = el('div', { className: 'notes' }, [el('h2', { textContent: "What's new" })]);
  let list = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) container.append(el('p', { textContent: paragraph.join(' ') }));
    paragraph = [];
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const bullet = line.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (!list) container.append((list = el('ul')));
      list.append(el('li', { textContent: stripInlineMarkdown(bullet[1]) }));
      continue;
    }
    list = null;
    if (!line) {
      flushParagraph();
      continue;
    }
    paragraph.push(stripInlineMarkdown(line.replace(/^#+\s*/, '')));
  }
  flushParagraph();

  return container.children.length > 1 ? container : null;
}

function openUrl(url) {
  chrome.tabs.create({ url });
  window.close();
}

function button(label, onClick, primary = false) {
  const node = el('button', { type: 'button', textContent: label, className: primary ? 'primary' : '' });
  node.addEventListener('click', onClick);
  return node;
}

function checkAgainButton() {
  const node = button('Check again', async () => {
    node.disabled = true;
    node.textContent = 'Checking…';
    const state = await checkForUpdates({ force: true });
    await refreshIndicator(state);
    render(state);
  });
  return node;
}

function render(state, { checking = false } = {}) {
  const children = [];

  if (isUpdateAvailable(state)) {
    const { version, url, notes } = state.latest;
    const pending = isUpdatePending(state);
    const title = el('h1', {}, pending ? [el('span', { className: 'dot' }), 'Update available'] : ['Update skipped']);

    children.push(title, el('p', { className: 'subtitle', textContent: `Version ${version} is out. You have ${currentVersion()}.` }));

    const notesBlock = renderNotes(notes);
    if (notesBlock) children.push(notesBlock);

    children.push(
      el('p', {
        className: 'hint',
        textContent: pending
          ? 'Download the zip, replace the files in your extension folder, then click Reload on chrome://extensions.'
          : 'You will not be reminded again until the next version is released.',
      }),
    );

    const actions = [button('Get update', () => openUrl(url), true)];
    if (pending) {
      actions.push(
        button('Skip this version', async () => {
          render(await skipVersion(version));
        }),
      );
    }
    children.push(el('div', { className: 'actions' }, actions));
  } else if (state.latest && !state.error) {
    const subtitle =
      compareVersions(currentVersion(), state.latest.version) > 0
        ? `Latest published release is ${state.latest.version}.`
        : `Version ${currentVersion()} is the latest release.`;
    children.push(
      el('h1', { textContent: "You're up to date" }),
      el('p', { className: 'subtitle', textContent: subtitle }),
      el('div', { className: 'actions' }, [checkAgainButton()]),
    );
  } else if (checking) {
    children.push(el('h1', { textContent: 'Checking for updates…' }));
  } else {
    children.push(
      el('h1', { textContent: "Couldn't check for updates" }),
      el('p', { className: 'subtitle', textContent: state.error || 'GitHub is not reachable right now.' }),
      el('div', { className: 'actions' }, [button('Open releases', () => openUrl(RELEASES_URL), true), checkAgainButton()]),
    );
  }

  content.replaceChildren(...children);
}

const initial = await getState();
render(initial, { checking: true });

const fresh = await checkForUpdates();
await refreshIndicator(fresh);
render(fresh);
