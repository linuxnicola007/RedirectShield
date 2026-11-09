# RedirectShield

**A small, fully offline Chrome/Edge/Brave extension that warns you before you open suspicious web addresses.**

RedirectShield (Manifest V3) scores every page you navigate to using simple, readable rules. If the score is high, it replaces the page with a warning that explains *why*. Nothing leaves your browser: there are no servers, no accounts and no external services.

> **Status: early prototype / learning project.** It is a rule-based helper, not a replacement for Google Safe Browsing, Microsoft Defender SmartScreen or a proper security product. It will miss threats and it can flag harmless sites. See [Limitations](#limitations).

---

## What it checks

| Check | Points | Example |
|---|---|---|
| Domain is on the local suspicious list | +60 | `fake-login.xyz` |
| Typosquatting (name 1 to 2 letters away from a big brand) | +40 | `paypa1.com` |
| Look-alike (homograph) characters in the host name | +40 | Cyrillic `а` in a Latin name |
| Phishing words in the host or path | +15 | `verify`, `account-update` |
| URL shortener | +20 | `bit.ly` |
| Heavy URL encoding or very long encoded strings | +20 | `%41%42...` |
| Very long URL (over 120 characters) | +10 | |
| Redirect chain | +10, or +10 per extra hop above 3 (max +30) | |

| Total score | Verdict | What happens |
|---|---|---|
| 0 to 29 | Safe | Page opens normally |
| 30 to 59 | Suspicious | Opens normally. Blocked only if **Strict mode** is on |
| 60 and above | Dangerous | Warning page is shown |

Sites on the trusted list (for example `github.com`, `google.com`) are always allowed.

## Features

- Warning page showing the blocked address, the score and every reason
- **Go Back** or **Proceed Anyway** (allowed for that site until you close the browser)
- Popup with on/off switch, Strict mode and the five most recent events
- Dashboard (extension options page) with totals and a history of flagged pages
- 100% local: it makes **no network requests**

## Install (developer mode)

1. Download or clone this repository.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and choose the `safe-redirect-blocker` folder (the one that contains `manifest.json`).

```bash
git clone https://github.com/linuxnicola007/safe-redirect-blocker.git
```

## Try it

Open `http://fake-login.xyz/` in the browser. It is on the built-in suspicious list, so you should see the warning page with a score of 60 or more. The site does not need to exist: the check happens before the page loads.

## Permissions

| Permission | Why |
|---|---|
| `webNavigation` | Look at each page address before it loads |
| `webRequest` | Count HTTP redirects (it only watches, it never changes requests) |
| `tabs` | Show the warning page in the tab |
| `storage` | Save settings and the history on your device |
| `notifications` | Tell you when a site was blocked |
| `activeTab`, `scripting` | Page checks |
| `<all_urls>` (host access) | Pages from any site can be checked |

## Privacy

Settings and history stay in your browser (`chrome.storage`). The extension sends no data anywhere. You can view or clear it by removing the extension.

## Project structure

```
safe-redirect-blocker/
├── manifest.json
├── background/    service worker: navigation check, scoring, redirect monitor
├── content/       page scripts: look for hidden frames, fake login forms, JS redirects
├── popup/         toolbar popup
├── dashboard/     options page with totals and history
├── warning/       the page shown for blocked addresses
├── database/      trusted domains, suspicious domains, phishing words (plain JSON, easy to edit)
├── utils/         storage, domain helpers, logger
└── assets/icons/  extension icons
```

You can add your own entries to the lists in `database/*.json`. The suspicious list is copied into the browser storage when the extension is installed, so after you edit it, remove and re-add the extension.

## Limitations

- **Small lists.** The built-in suspicious list has three example domains. Real phishing sites change daily and will not be on it.
- **Rules, not intelligence.** Scores come from simple patterns. A phishing site with a clean-looking address will not be flagged. A harmless site with `login` in its address can get points.
- **Only the main page address is scored.** Frames and later page content are not blocked.
- **The page scanners are passive.** The scripts that look for hidden frames and fake login forms run, but their findings do not change the score yet.
- **No reputation data.** There is no connection to Safe Browsing or similar services, on purpose, to keep the extension offline.
- Use it as an extra layer of caution, not as proof that a site is safe.

## Roadmap

- Feed page-scanner findings into the score
- Import and export of your own block and trust lists
- A settings page for the points and thresholds
- Optional online reputation lookup (off by default)
- Automated tests

## License

MIT. See [LICENSE](LICENSE).
