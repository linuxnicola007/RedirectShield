// Content scripts cannot use ES-module "import" directly. This tiny loader imports the real module.
(async () => {
  try {
    await import(chrome.runtime.getURL('content/content.js'));
  } catch (e) {
    console.error('[RedirectShield] content script failed to load', e);
  }
})();
