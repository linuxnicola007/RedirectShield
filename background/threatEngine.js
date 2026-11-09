/**
 * Threat scoring engine: combines results from URL analysis, redirect analysis, and content detection.
 */

import { URLScanner } from './urlAnalyzer.js';
import logger from '../utils/logger.js';
import { getSuspiciousDomains, getTrustedDomains } from '../utils/storage.js';

export class ThreatEngine {
  constructor() {
    this.urlScanner = new URLScanner();
  }

  /**
   * Evaluate a navigation request and return threat score + reasons.
   * @param {string} url - The target URL
   * @param {Object} context - Additional context: redirectChain, sourceTabId, etc.
   * @returns {Promise<{score: number, verdict: string, reasons: string[]}>}
   */
  async evaluateNavigation(url, context = {}) {
    let score = 0;
    const reasons = [];

    // 1. Check local blacklists/whitelists
    const suspiciousSet = await getSuspiciousDomains();
    const trustedSet = await getTrustedDomains();
    const domain = this.extractDomain(url);
    if (trustedSet.has(domain)) {
      return { score: 0, verdict: 'safe', reasons: ['Domain is trusted'] };
    }
    if (suspiciousSet.has(domain)) {
      score += 60;
      reasons.push('Domain found in local suspicious list');
    }

    // 2. Run URL scanner (typosquatting, keywords, length, encoding, homograph)
    const urlAnalysis = await this.urlScanner.analyze(url);
    score += urlAnalysis.score;
    reasons.push(...urlAnalysis.reasons);

    // 3. Redirect chain penalty
    if (context.redirectChain && context.redirectChain.length > 3) {
      const chainPenalty = Math.min(30, (context.redirectChain.length - 3) * 10);
      score += chainPenalty;
      reasons.push(`Long redirect chain (${context.redirectChain.length} hops) +${chainPenalty}`);
    } else if (context.redirectChain && context.redirectChain.length > 1) {
      score += 10;
      reasons.push(`Redirect chain detected +10`);
    }

    // 4. Hidden iframe or suspicious content (passed from content script)
    if (context.suspiciousContent) {
      score += 30;
      reasons.push('Hidden iframe or fake login form detected');
    }

    // Determine verdict
    let verdict = 'safe';
    if (score >= 60) verdict = 'dangerous';
    else if (score >= 30) verdict = 'suspicious';

    return { score, verdict, reasons };
  }

  extractDomain(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
}