/**
 * Simple logger that can be toggled in production.
 */

const DEBUG = true;

export default {
  info: (...args) => DEBUG && console.log('[RedirectShield INFO]', ...args),
  warn: (...args) => console.warn('[RedirectShield WARN]', ...args),
  error: (...args) => console.error('[RedirectShield ERROR]', ...args)
};