/**
 * Content script – injected into every page.
 * Detects client‑side redirects, hidden forms, phishing overlays.
 */

import { PhishingDetector } from './phishingDetector.js';
import { DOMScanner } from './domScanner.js';
import { RedirectDetector } from './redirectDetector.js';
import logger from '../utils/logger.js';

const detector = new PhishingDetector();
const domScanner = new DOMScanner();
const redirectDetector = new RedirectDetector();

// Run detection when DOM is ready
window.addEventListener('load', () => {
  domScanner.scanForHiddenElements();
  detector.checkForLoginFormSpoofing();
  redirectDetector.monitorJavaScriptRedirects();
});

// Listen for messages from background (to request page analysis)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getPageThreats') {
    const threats = {
      suspiciousForms: detector.getSuspiciousForms(),
      hiddenIframes: domScanner.getHiddenIframes(),
      jsRedirectDetected: redirectDetector.hasRedirected()
    };
    sendResponse(threats);
  }
  return true;
});