// Release update checks shared by the background worker and the popup.

const REPO = 'DennisLypovetsky/polymarket-apr';
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

const STATE_KEY = 'updateState';
const MIN_CHECK_INTERVAL_MS = 15 * 60 * 1000;

const DOT_COLOR = '#ff9500';
const ICON_SIZES = [16, 32];

export function currentVersion() {
  return chrome.runtime.getManifest().version;
}

export function parseVersion(value) {
  const match = String(value || '').trim().match(/^v?(\d+(?:\.\d+){0,3})$/i);
  if (!match) return null;
  return match[1].split('.').map(Number);
}

export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export async function getState() {
  const stored = await chrome.storage.local.get(STATE_KEY);
  return {
    latest: null,
    checkedAt: 0,
    error: null,
    skippedVersion: null,
    ...(stored[STATE_KEY] || {}),
  };
}

async function saveState(patch) {
  const state = { ...(await getState()), ...patch };
  await chrome.storage.local.set({ [STATE_KEY]: state });
  return state;
}

async function fetchLatestRelease() {
  const response = await fetch(API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GitHub API responded with ${response.status}`);

  const release = await response.json();
  const tag = String(release.tag_name || '');
  if (!parseVersion(tag)) throw new Error(`Unexpected release tag "${tag}"`);

  return {
    version: tag.replace(/^v/i, ''),
    url: release.html_url || RELEASES_URL,
    notes: String(release.body || ''),
    publishedAt: release.published_at || null,
  };
}

export async function checkForUpdates({ force = false } = {}) {
  const state = await getState();
  if (!force && Date.now() - state.checkedAt < MIN_CHECK_INTERVAL_MS) return state;

  try {
    const latest = await fetchLatestRelease();
    return await saveState({ latest, checkedAt: Date.now(), error: null });
  } catch (error) {
    return await saveState({ checkedAt: Date.now(), error: String(error?.message || error) });
  }
}

export function isUpdateAvailable(state) {
  const latestVersion = state.latest?.version;
  return Boolean(latestVersion) && compareVersions(latestVersion, currentVersion()) > 0;
}

export function isUpdatePending(state) {
  if (!isUpdateAvailable(state)) return false;
  const skipped = state.skippedVersion;
  return !skipped || compareVersions(state.latest.version, skipped) > 0;
}

export async function skipVersion(version) {
  const state = await saveState({ skippedVersion: version });
  await refreshIndicator(state);
  return state;
}

async function drawIconWithDot() {
  const response = await fetch(chrome.runtime.getURL('icon.png'));
  const bitmap = await createImageBitmap(await response.blob());
  const imageData = {};

  for (const size of ICON_SIZES) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, size, size);

    // Cut a transparent ring around the dot so it reads on light and dark toolbars.
    const radius = size * 0.2;
    const gap = Math.max(1, size * 0.07);
    const cx = size - radius;
    const cy = radius;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + gap, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = DOT_COLOR;
    ctx.fill();

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  return imageData;
}

export async function refreshIndicator(state) {
  if (isUpdatePending(state)) {
    await chrome.action.setIcon({ imageData: await drawIconWithDot() });
    await chrome.action.setTitle({ title: `Polymarket APR: version ${state.latest.version} is available` });
  } else {
    await chrome.action.setIcon({ path: 'icon.png' });
    await chrome.action.setTitle({ title: 'Polymarket APR' });
  }
}
