/**
 * Monitors JavaScript-based redirects (window.location, meta refresh, etc.)
 */

export class RedirectDetector {
  constructor() {
    this.redirectDetected = false;
    this.originalLocation = window.location.href;
  }

  monitorJavaScriptRedirects() {
    // Override window.location assign/replace
    const originalAssign = window.location.assign;
    const originalReplace = window.location.replace;
    const self = this;
    window.location.assign = function(url) {
      self.reportRedirect(url, 'assign');
      return originalAssign.call(this, url);
    };
    window.location.replace = function(url) {
      self.reportRedirect(url, 'replace');
      return originalReplace.call(this, url);
    };
    // Detect meta refresh
    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
    if (metaRefresh) {
      const content = metaRefresh.getAttribute('content');
      const urlMatch = content.match(/url=(.*)/i);
      if (urlMatch) {
        this.reportRedirect(urlMatch[1], 'meta-refresh');
      }
    }
  }

  reportRedirect(url, method) {
    this.redirectDetected = true;
    chrome.runtime.sendMessage({
      type: 'jsRedirect',
      data: { from: this.originalLocation, to: url, method }
    });
  }

  hasRedirected() {
    return this.redirectDetected;
  }
}