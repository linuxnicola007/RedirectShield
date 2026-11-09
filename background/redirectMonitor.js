/**
 * Monitors HTTP redirects and navigation redirect chains.
 * Uses webRequest and webNavigation APIs.
 */

import logger from '../utils/logger.js';
import { storeRedirectEvent } from '../utils/storage.js';

export class RedirectMonitor {
  constructor() {
    this.activeChains = new Map(); // tabId -> { originalUrl, redirects: [], finalUrl, startTime }
    this.redirectThreshold = 5;    // mark as suspicious after 5 hops
    this.isMonitoring = false;
    this.onRedirect = this.handleBeforeRedirect.bind(this);
    this.onCompleted = this.handleNavigationCompleted.bind(this);
  }

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Listen for beforeRedirect – captures HTTP redirects
    chrome.webRequest.onBeforeRedirect.addListener(
      this.onRedirect,
      { urls: ["<all_urls>"] },
      []
    );

    // Listen for completed navigation to finalise chain
    chrome.webNavigation.onCompleted.addListener(
      this.onCompleted
    );

    // Cleanup when tab is closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.activeChains.delete(tabId);
    });
  }

  stop() {
    if (!this.isMonitoring) return;
    chrome.webRequest.onBeforeRedirect.removeListener(this.onRedirect);
    chrome.webNavigation.onCompleted.removeListener(this.onCompleted);
    this.isMonitoring = false;
  }

  handleBeforeRedirect(details) {
    const { tabId, url, redirectUrl } = details;
    if (tabId === -1) return; // not a tab

    let chain = this.activeChains.get(tabId);
    if (!chain) {
      // initialise new chain with the original URL (we need original, but we don't have it here)
      // We'll set original as the first URL we see, but a better way is to use onBeforeNavigate.
      // For simplicity, we get the original from the first redirect.
      chain = {
        originalUrl: url,
        redirects: [],
        startTime: Date.now()
      };
      this.activeChains.set(tabId, chain);
    }
    chain.redirects.push({ from: url, to: redirectUrl, time: Date.now() });
    chain.finalUrl = redirectUrl;

    // If chain length exceeds threshold, mark as suspicious via storage event
    if (chain.redirects.length >= this.redirectThreshold) {
      logger.warn(`Long redirect chain detected on tab ${tabId}: ${chain.redirects.length} hops`);
      storeRedirectEvent({
        tabId,
        originalUrl: chain.originalUrl,
        redirects: chain.redirects,
        finalUrl: redirectUrl,
        suspicious: true,
        reason: 'Excessive redirect chain'
      });
    }
  }

  handleNavigationCompleted(details) {
    const { tabId, url } = details;
    const chain = this.activeChains.get(tabId);
    if (chain && chain.redirects.length > 0) {
      // Store the final chain
      storeRedirectEvent({
        tabId,
        originalUrl: chain.originalUrl,
        redirects: chain.redirects,
        finalUrl: url,
        suspicious: chain.redirects.length >= this.redirectThreshold,
        reason: chain.redirects.length >= this.redirectThreshold ? 'Excessive redirect chain' : ''
      });
    }
    this.activeChains.delete(tabId);
  }
}