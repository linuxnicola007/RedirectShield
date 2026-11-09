import { loadSettings, getRecentActivity, getStats } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enableToggle');
  const strictToggle = document.getElementById('strictToggle');
  const blockCountSpan = document.getElementById('blockCount');
  const suspiciousCountSpan = document.getElementById('suspiciousCount');
  const activityList = document.getElementById('activityList');

  // Load settings
  const settings = await loadSettings();
  enableToggle.checked = settings.enabled !== false;
  strictToggle.checked = settings.strictMode === true;

  // Stats
  const stats = await getStats();
  blockCountSpan.textContent = stats.totalBlocked || 0;
  suspiciousCountSpan.textContent = stats.totalSuspicious || 0;

  // Recent activities
  const activities = await getRecentActivity(5);
  activityList.innerHTML = '';
  if (activities.length === 0) {
    activityList.innerHTML = '<li>No recent events</li>';
  } else {
    activities.forEach(act => {
      const li = document.createElement('li');
      li.textContent = `${new Date(act.timestamp).toLocaleTimeString()} - ${act.url} (${act.verdict})`;
      activityList.appendChild(li);
    });
  }

  // Event listeners
  enableToggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ enabled: e.target.checked });
    chrome.runtime.sendMessage({ action: 'settingsChanged' });
  });
  strictToggle.addEventListener('change', async (e) => {
    await chrome.storage.local.set({ strictMode: e.target.checked });
    chrome.runtime.sendMessage({ action: 'settingsChanged' });
  });
  document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});