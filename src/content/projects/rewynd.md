---
title: "Rewynd"
description: >-
  Built to fill a gap I felt backtesting on FX Replay — ended up catching the attention of their team.
tags:
  - React
  - TypeScript
  - Chrome MV3
  - Zustand
  - Recharts
  - Lexical
  - TailwindCSS
image: "rewynd.png"
video: "rewynd-demo.webm"
quote: "We saw what you're doing with the analytics and we're super impressed with your work."
citation: "Matt Concordia, CPO · FX Replay"
ctas:
  - label: "Add to Chrome"
    href: "https://chromewebstore.google.com/detail/rewynd/iekanoemnenffcmijcdpflgpclnhccje"
  - label: "Read more"
    href: "/projects/rewynd"
github: "https://github.com/ahmadghoniem/Rewynd"
order: 1
---

I got into trading the way many people do — early gains that made me think I understood what I was doing. I didn't. The same leverage that grew a small account wiped most of it just as quickly. That's when it clicked: trading isn't really about prediction — it's about discipline, consistency, and managing risk.

To actually practice, I started using FxReplay to replay historical market data and trade it as if it were live. But two things kept bothering me: it didn't show how long a trade had been open, or the risk exposure per position — things you had to track or calculate yourself.

So I built a Chrome extension to surface those automatically. That idea eventually grew into something bigger — what started as a small quality-of-life fix grew into a full analytics dashboard that turns replay sessions into simulated prop firm challenges, where traders operate under strict rules and get funded if they pass.

After sharing it on Reddit, the FxReplay team reached out — they told me the extension had actually inspired them to build their own version of the feature.

## How it works

![Architecture diagram](/src/assets/projects/rewynd/architecture_diagram.svg)

FxReplay exposes no API, so the DOM is the only interface — the content script reads balance, PnL, and trade rows directly from rendered HTML. A background service worker receives that data, persists it via Chrome's Storage API, and acts as the coordination layer between extension components. The dashboard — a React app with Zustand for state and Recharts for visualizations — reads from storage and stays in sync through Chrome's native storage events. When anything writes to storage, everything listening updates automatically.

The dashboard updates reactively on every storage change — streak tracking is smart enough to treat break-even trades as neutral, and sessions, configs, and journal notes can all be exported and restored so nothing is ever tied to a single browser.

## Technical highlights

### From message chains to storage events

![Storage events diagram](/src/assets/projects/rewynd/message_to_storage_events_diagram.svg)

The original sync wired four steps in sequence: content script sends data → background saves → background notifies dashboard → dashboard re-fetches. The last two steps were the problem — if the dashboard wasn't ready to receive the notification, it was lost and the data never arrived.

The fix was to stop treating Chrome's storage as a passive database and start using it as a message bus. The background worker still saves to storage, but now the dashboard subscribes to `chrome.storage.onChanged` instead of waiting to be told. When storage updates, Chrome broadcasts the change automatically to every listener — no explicit notification, no re-fetch, no race conditions. A cleanup function removes the listener on component unmount to prevent memory leaks. The dashboard doesn't ask for updates anymore — it just receives them.

### Forcing the active tab for initial data extraction

Chrome throttles background tabs to conserve resources — JavaScript runs at lower priority,
timers slow to roughly one-second intervals, and DOM updates are minimized. For Rewynd this
mattered: the initial sync navigates paginated tables and waits for DOM updates to settle, so
running it in a background tab made the whole process significantly slower and prone to missing
updates entirely.

The fix was to bring the FxReplay tab into the foreground before pulling data. The extension calls `chrome.tabs.update(tabId, { active: true })`, runs the full extraction at normal priority, then returns to the extension tab. The switch is brief enough to be imperceptible — and once the MutationObserver is running, ongoing changes sync reactively without ever needing foreground access again.
