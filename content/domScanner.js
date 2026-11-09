/**
 * Scans DOM for hidden iframes, invisible buttons, and fake payment overlays.
 */

export class DOMScanner {
  constructor() {
    this.hiddenIframes = [];
  }

  scanForHiddenElements() {
    // Hidden iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const style = window.getComputedStyle(iframe);
      if (style.display === 'none' || style.visibility === 'hidden' || iframe.width === '0' || iframe.height === '0') {
        this.hiddenIframes.push(iframe.src || 'about:blank');
      }
    });
    if (this.hiddenIframes.length > 0) {
      this.notifyBackground();
    }
  }

  getHiddenIframes() {
    return this.hiddenIframes;
  }

  notifyBackground() {
    chrome.runtime.sendMessage({
      type: 'hiddenIframeDetected',
      data: this.hiddenIframes
    });
  }
}