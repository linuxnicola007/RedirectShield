/**
 * Intercepts beforeNavigate and onBeforeRequest to evaluate threats.
 * Blocks dangerous URLs by redirecting to the warning page.
 */

import logger from '../utils/logger.js';
import { storeBlockedAttempt, isHostAllowed } from '../utils/storage.js';

export class NavigationHandler {
  constructor(redirectMonitor, threatEngine, strictMode) {
    this.redirectMonitor = redirectMonitor;
    this.threatEngine = threatEngine;
    this.strictMode = strictMode;
    this.activeChecks = new Map(); // tabId -> promise
    this.enabled = true;
    this.listener = this.handleNavigation.bind(this);
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;
    chrome.webNavigation.onBeforeNavigate.addListener(this.listener);
  }

  stop() {
    chrome.webNavigation.onBeforeNavigate.removeListener(this.listener);
    this.started = false;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  updateStrictMode(enabled) {
    this.strictMode = enabled;
  }

  async handleNavigation(details) {
    if (!this.enabled) return;
    const { tabId, url, frameId } = details;
    // Only main frame (top-level) or iframe? We'll focus on main frame to avoid performance issues.
    if (frameId !== 0) return;

    // Avoid re‑evaluating the warning page itself
    if (url.startsWith(chrome.runtime.getURL('warning/warning.html'))) return;

    // Only web pages are checked; chrome://, about: and extension pages are ignored.
    if (!/^https?:/i.test(url)) return;
    // The user chose "Proceed anyway" for this site in this session.
    if (await isHostAllowed(url)) return;

    // Prevent duplicate checks on same tab
    if (this.activeChecks.has(tabId)) return;
    const checkPromise = this.performCheck(tabId, url);
    this.activeChecks.set(tabId, checkPromise);
    try {
      await checkPromise;
    } finally {
      this.activeChecks.delete(tabId);
    }
  }

  async performCheck(tabId, url) {
    // Get redirect chain from monitor (if any)
    const chainInfo = this.redirectMonitor.activeChains.get(tabId);
    const redirectChain = chainInfo ? chainInfo.redirects.map(r => r.from) : [];

    // Evaluate threat
    const evaluation = await this.threatEngine.evaluateNavigation(url, {
      redirectChain,
      sourceTabId: tabId
    });

    // Store only pages that were flagged, so the history is a list of threats, not of every page visited.
    if (evaluation.verdict !== 'safe') {
      await storeBlockedAttempt({
        url,
        score: evaluation.score,
        verdict: evaluation.verdict,
        reasons: evaluation.reasons,
        timestamp: Date.now(),
        tabId
      });
    }

    if (evaluation.verdict === 'dangerous' || (this.strictMode && evaluation.verdict === 'suspicious')) {
      // Block and show warning
      logger.warn(`Blocking dangerous navigation to ${url} (score ${evaluation.score})`);
      await this.blockNavigation(tabId, url, evaluation);
    } else {
      // Allow (or log if suspicious but not strict)
      if (evaluation.verdict === 'suspicious') {
        logger.info(`Suspicious but allowed (strict mode off): ${url}`);
      }
    }
  }

  async blockNavigation(tabId, originalUrl, evaluation) {
    // Cancel the navigation by redirecting to warning page
    const warningUrl = chrome.runtime.getURL(`warning/warning.html?url=${encodeURIComponent(originalUrl)}&score=${evaluation.score}&verdict=${evaluation.verdict}&reasons=${encodeURIComponent(JSON.stringify(evaluation.reasons))}`);
    await chrome.tabs.update(tabId, { url: warningUrl });
    // Also show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
      title: 'RedirectShield',
      message: `Blocked dangerous site: ${originalUrl}`
    });
  }
}