/**
 * Detects fake login forms, credential harvesters, and suspicious DOM elements.
 */

export class PhishingDetector {
  constructor() {
    this.suspiciousForms = [];
  }

  checkForLoginFormSpoofing() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const action = form.action.toLowerCase();
      const hasPassword = form.querySelector('input[type="password"]') !== null;
      if (hasPassword && !action.includes(window.location.hostname)) {
        // Form submits to a different domain -> likely phishing
        this.suspiciousForms.push({
          action,
          method: form.method,
          location: window.location.href
        });
        this.notifyBackground();
      }
    });
  }

  getSuspiciousForms() {
    return this.suspiciousForms;
  }

  notifyBackground() {
    chrome.runtime.sendMessage({
      type: 'suspiciousContent',
      data: { forms: this.suspiciousForms }
    });
  }
}