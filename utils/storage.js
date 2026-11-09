/**
 * Wrapper for chrome.storage.local with typed data.
 */

const STORAGE_KEYS = {
  SETTINGS: 'shield_settings',
  BLOCKED_HISTORY: 'shield_blocked_history',
  REDIRECT_EVENTS: 'shield_redirect_events',
  SUSPICIOUS_DOMAINS: 'shield_suspicious_domains',
  TRUSTED_DOMAINS: 'shield_trusted_domains'
};

async function readBundled(path, field, fallback) {
  try {
    const r = await fetch(chrome.runtime.getURL(path));
    const j = await r.json();
    return Array.isArray(j[field]) ? j[field] : fallback;
  } catch {
    return fallback;
  }
}

export async function initStorage() {
  const defaults = {
    [STORAGE_KEYS.SETTINGS]: { enabled: true, strictMode: false },
    [STORAGE_KEYS.BLOCKED_HISTORY]: [],
    [STORAGE_KEYS.REDIRECT_EVENTS]: [],
    [STORAGE_KEYS.SUSPICIOUS_DOMAINS]: [],
    [STORAGE_KEYS.TRUSTED_DOMAINS]: ['github.com', 'google.com', 'microsoft.com']
  };
  // Seed the domain lists from the bundled database files.
  defaults[STORAGE_KEYS.SUSPICIOUS_DOMAINS] = await readBundled('database/suspiciousDomains.json', 'domains', []);
  defaults[STORAGE_KEYS.TRUSTED_DOMAINS] = await readBundled('database/trustedDomains.json', 'domains', defaults[STORAGE_KEYS.TRUSTED_DOMAINS]);
  const existing = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (existing[key] === undefined) toSet[key] = defaultValue;
  }
  if (Object.keys(toSet).length) await chrome.storage.local.set(toSet);
}

// The popup writes "enabled" and "strictMode" as top-level keys, so they are read from there.
export async function loadSettings() {
  const res = await chrome.storage.local.get(['enabled', 'strictMode']);
  return { enabled: res.enabled !== false, strictMode: res.strictMode === true };
}

// "Proceed anyway" allow-list: kept for this browser session only.
const ALLOW_KEY = 'shield_allowed_hosts';
export async function allowHostForSession(url) {
  const host = new URL(url).hostname;
  const { [ALLOW_KEY]: list = [] } = await chrome.storage.session.get(ALLOW_KEY);
  if (!list.includes(host)) list.push(host);
  await chrome.storage.session.set({ [ALLOW_KEY]: list });
}
export async function isHostAllowed(url) {
  try {
    const host = new URL(url).hostname;
    const { [ALLOW_KEY]: list = [] } = await chrome.storage.session.get(ALLOW_KEY);
    return list.includes(host);
  } catch {
    return false;
  }
}

export async function storeBlockedAttempt(attempt) {
  const key = STORAGE_KEYS.BLOCKED_HISTORY;
  const { [key]: history = [] } = await chrome.storage.local.get(key);
  history.unshift(attempt);
  if (history.length > 200) history.pop();
  await chrome.storage.local.set({ [key]: history });
}

export async function getAllBlockedHistory() {
  const { [STORAGE_KEYS.BLOCKED_HISTORY]: history } = await chrome.storage.local.get(STORAGE_KEYS.BLOCKED_HISTORY);
  return history || [];
}

export async function getRecentActivity(limit = 10) {
  const history = await getAllBlockedHistory();
  return history.slice(0, limit);
}

export async function getStats() {
  const history = await getAllBlockedHistory();
  const totalBlocked = history.filter(e => e.verdict === 'dangerous').length;
  const totalSuspicious = history.filter(e => e.verdict === 'suspicious').length;
  const { [STORAGE_KEYS.REDIRECT_EVENTS]: redirects = [] } = await chrome.storage.local.get(STORAGE_KEYS.REDIRECT_EVENTS);
  const totalRedirects = redirects.length;
  return { totalBlocked, totalSuspicious, totalRedirects };
}

export async function storeRedirectEvent(event) {
  const key = STORAGE_KEYS.REDIRECT_EVENTS;
  const { [key]: events = [] } = await chrome.storage.local.get(key);
  events.unshift(event);
  if (events.length > 100) events.pop();
  await chrome.storage.local.set({ [key]: events });
}

export async function getSuspiciousDomains() {
  const { [STORAGE_KEYS.SUSPICIOUS_DOMAINS]: list } = await chrome.storage.local.get(STORAGE_KEYS.SUSPICIOUS_DOMAINS);
  return new Set(list || []);
}

export async function getTrustedDomains() {
  const { [STORAGE_KEYS.TRUSTED_DOMAINS]: list } = await chrome.storage.local.get(STORAGE_KEYS.TRUSTED_DOMAINS);
  return new Set(list || []);
}