const urlParams = new URLSearchParams(window.location.search);
const originalUrl = decodeURIComponent(urlParams.get('url') || '');
const score = urlParams.get('score') || '?';
const verdict = urlParams.get('verdict') || 'Dangerous';
let reasons = [];
try {
  reasons = JSON.parse(decodeURIComponent(urlParams.get('reasons') || '[]'));
} catch(e) {}

document.getElementById('blockedUrl').innerText = originalUrl;
document.getElementById('score').innerText = score;
document.getElementById('verdict').innerText = verdict;
const reasonsList = document.getElementById('reasonsList');
reasons.forEach(r => {
  const li = document.createElement('li');
  li.textContent = r;
  reasonsList.appendChild(li);
});

document.getElementById('goBack').addEventListener('click', () => {
  window.history.back();
});
document.getElementById('proceedAnyway').addEventListener('click', () => {
  // Allow navigation by opening the original URL directly (bypassing our block)
  // Only plain web addresses are allowed (never javascript:, data:, file: ...).
  let target;
  try { target = new URL(originalUrl); } catch { return; }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') return;
  chrome.runtime.sendMessage({ action: 'temporarilyWhitelist', url: target.href }, () => {
    window.location.href = target.href;
  });
});