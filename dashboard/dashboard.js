import { getAllBlockedHistory, getStats } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const stats = await getStats();
  document.getElementById('totalBlocked').innerText = stats.totalBlocked || 0;
  document.getElementById('totalSuspicious').innerText = stats.totalSuspicious || 0;
  document.getElementById('totalRedirects').innerText = stats.totalRedirects || 0;

  const history = await getAllBlockedHistory();
  const tableBody = document.querySelector('#historyTable tbody');
  tableBody.innerHTML = '';
  history.slice(0, 50).forEach(entry => {
    const row = tableBody.insertRow();
    row.insertCell(0).innerText = new Date(entry.timestamp).toLocaleString();
    row.insertCell(1).innerText = entry.url.substring(0, 60);
    row.insertCell(2).innerText = entry.score;
    row.insertCell(3).innerText = entry.verdict;
    row.insertCell(4).innerText = entry.reasons.join(', ');
  });
});
