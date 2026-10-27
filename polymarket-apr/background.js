import { checkForUpdates, getState, refreshIndicator } from './updates.js';

const ALARM_NAME = 'update-check';
const CHECK_PERIOD_MINUTES = 6 * 60;

async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM_NAME))) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_PERIOD_MINUTES });
  }
}

async function check(force) {
  await refreshIndicator(await getState());
  await refreshIndicator(await checkForUpdates({ force }));
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  check(true);
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  check(false);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) check(true);
});
