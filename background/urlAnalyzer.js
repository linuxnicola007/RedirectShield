/**
 * URL analysis: typosquatting, phishing keywords, encoded URLs, homograph attacks.
 */

import { calculateLevenshtein, isHomoglyphAttack } from '../utils/domainUtils.js';

// JSON "import assertions" are not supported by current Chrome, so the keyword list is fetched once instead.
let keywordsPromise;
function loadKeywords() {
  keywordsPromise ||= fetch(chrome.runtime.getURL('database/phishingKeywords.json'))
    .then((r) => r.json())
    .then((j) => (Array.isArray(j.keywords) ? j.keywords : []))
    .catch(() => []);
  return keywordsPromise;
}

// List of well-known brands for typosquatting detection
const BRANDS = [
  'google', 'facebook', 'microsoft', 'paypal', 'apple', 'amazon',
  'binance', 'coinbase', 'netflix', 'instagram', 'twitter', 'linkedin'
];

export class URLScanner {
  async analyze(url) {
    const keywords = await loadKeywords();
    let score = 0;
    const reasons = [];

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname + urlObj.search;

      // 1. Typosquatting against brands
      const typoResult = this.detectTyposquatting(hostname);
      if (typoResult.detected) {
        score += 40;
        reasons.push(`Typosquatting: ${typoResult.similarTo} +40`);
      }

      // 2. Suspicious keywords in hostname or path
      const keywordScore = this.detectSuspiciousKeywords(hostname + path, keywords);
      if (keywordScore > 0) {
        score += keywordScore;
        reasons.push(`Suspicious keywords (${keywordScore} pts)`);
      }

      // 3. URL length anomaly
      if (url.length > 120) {
        score += 10;
        reasons.push(`Overly long URL (+10)`);
      }

      // 4. Encoded URL (multiple % encoding or base64-like)
      if (this.hasExcessiveEncoding(url)) {
        score += 20;
        reasons.push(`Excessive URL encoding (+20)`);
      }

      // 5. Homograph attack (Unicode trick)
      if (isHomoglyphAttack(hostname)) {
        score += 40;
        reasons.push(`Homograph attack (Unicode spoofing) +40`);
      }

      // 6. URL shortener detection (common domains)
      if (this.isUrlShortener(hostname)) {
        score += 20;
        reasons.push(`URL shortener (+20)`);
      }

    } catch (err) {
      // ignore invalid URL
    }

    return { score, reasons };
  }

  detectTyposquatting(hostname) {
    // Remove common TLD and www
    let base = hostname.replace(/^www\./, '').replace(/\.[a-z]{2,}$/, '');
    for (const brand of BRANDS) {
      const distance = calculateLevenshtein(base, brand);
      if (distance === 1 || (distance === 2 && base.length > 5)) {
        return { detected: true, similarTo: brand };
      }
    }
    return { detected: false };
  }

  detectSuspiciousKeywords(text, keywords) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        score += 15;
        // prevent double counting same keyword
        break;
      }
    }
    return Math.min(score, 30);
  }

  hasExcessiveEncoding(url) {
    // Count %xx patterns
    const encodedMatches = url.match(/%[0-9A-Fa-f]{2}/g);
    if (encodedMatches && encodedMatches.length > 5) return true;
    // Check for base64-like long strings in path
    const b64Pattern = /[A-Za-z0-9+/]{40,}/;
    return b64Pattern.test(url);
  }

  isUrlShortener(hostname) {
    const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly'];
    return shorteners.some(s => hostname.includes(s));
  }
}