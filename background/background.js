/**
 * Background service worker – entry point.
 * Chrome (Manifest V3) restarts this worker whenever it needs it, so the event listeners are registered
 * immediately, every time the file runs. They must not wait for onInstalled/onStartup.
 */

import { RedirectMonitor } from './redirectMonitor.js';
import { ThreatEngine } from './threatEngine.js';
import { NavigationHandler } from './navigationHandler.js';
import { initStorage, loadSettings, allowHostForSession } from '../utils/storage.js';
import logger from '../utils/logger.js';

const redirectMonitor = new RedirectMonitor();
const threatEngine = new ThreatEngine();
const navigationHandler = new NavigationHandler(redirectMonitor, threatEngine, false);

// Register all listeners right now (synchronously).
redirectMonitor.start();
navigationHandler.start();

// Then apply the saved settings.
loadSettings().then((s) => {
  navigationHandler.setEnabled(s.enabled);
  navigationHandler.updateStrictMode(s.strictMode);
});

chrome.runtime.onInstalled.addListener(async () => {
  logger.info('RedirectShield installed/updated');
  await initStorage();
});

// Settings changed in the popup.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.enabled) navigationHandler.setEnabled(changes.enabled.newValue !== false);
  if (changes.strictMode) navigationHandler.updateStrictMode(changes.strictMode.newValue === true);
});

// "Proceed anyway" on the warning page. Only the warning page itself may send this message,
// never a content script running inside a website.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === 'temporarilyWhitelist') {
    const warningPage = chrome.runtime.getURL('warning/warning.html');
    if (!sender.url || !sender.url.startsWith(warningPage) || sender.tab === undefined) {
      sendResponse({ ok: false });
      return false;
    }
    allowHostForSession(msg.url).then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
    return true; // keep the channel open for the async reply
  }
  return false;
});
