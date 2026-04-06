---
title: "Rewynd"
description: >-
  Built to fill a gap I felt backtesting on FX Replay ended up catching the attention of their team.
overview: >-
  A Chrome extension that turns FxReplay backtesting sessions into simulated prop firm challenges. Track profit targets, drawdown limits, trading days, and performance stats — extracted directly from FxReplay, stored entirely on your machine.
tags:
  - React
  - TypeScript
  - Chrome MV3
  - Zustand
  - Recharts
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

I got into trading the way many people do — early gains with high leverage that made me think I understood what I was doing. **I didn't.** Without proper risk management, the same leverage that grew a small account wiped most of it just as quickly. That's when it clicked that trading is really about discipline, consistency, and managing risk.

Around that time I started using **FxReplay**, a platform for replaying historical market data to practice strategies. I liked it, but two things kept bothering me: it didn't show how long you'd held a trade or your risk exposure per position — something you either had to memorize or calculate from the lot size yourself.

So I built a Chrome extension to surface those two things automatically. Then I started wondering — **what if I could also simulate a prop firm challenge?**

Prop firms run evaluation programs where traders operate under strict rules — hitting profit targets, staying within drawdown limits, and proving consistency over time. Pass the evaluation, and they fund you with real capital.

What started as a small tool eventually grew into a full dashboard with a trading journal, equity curve, performance metrics, and a prop firm challenge simulator — **all running locally in the browser.**

> After sharing it on Reddit, the FxReplay team reached out — they said the extension had actually inspired them to build their own version of the feature.

## Architecture

![Architecture diagram](/src/assets/projects/rewynd/rewynd-architecture.svg)

The architecture has one hard constraint that shaped every decision: nothing leaves the browser. No server, no external API, no data in transit.

A content script runs inside FxReplay's tab and extracts account state directly from the DOM. A background service worker receives that data, persists it via Chrome's Storage API, and acts as the coordination layer between extension components. The popup — a React app with Zustand for state and Recharts for visualizations — reads from storage and stays in sync through Chrome's native storage events. When anything writes to storage, everything listening updates automatically.

The feature structure follows the Bulletproof React pattern: challenge configuration, performance metrics, trade history, and the trading journal each own their own state slice and components independently. Nothing is globally coupled unless it genuinely has to be.

## Notable technical details

### From message chains to storage events

![Storage events diagram](/src/assets/projects/rewynd/rewynd_messageToStorageEvents.svg)

The original sync wired four steps in sequence: content script sends data → background saves → background notifies popup → popup re-fetches. That chain had a fundamental timing problem — any gap between steps could leave the popup reading stale state, and there was no clean way to handle missed notifications.

The fix was to stop treating Chrome's storage as a passive database and start using it as a message bus. The content script writes to storage; the popup subscribes to `chrome.storage.onChanged`. When any extension component writes, Chrome broadcasts the change automatically to every listener — no explicit coordination, no retry logic, no race conditions. The chain went from four hops to zero. A cleanup function removes the listener on component unmount to prevent memory leaks. The data flow is now fully reactive: the popup doesn't ask for updates, it just receives them.

### DOM scraping as the data layer

FxReplay has no public API. The only path to account data is through the DOM, which means the extension is, at its core, a structured web scraper.

The content script identifies account state using stable CSS selectors — balance, realized PnL, closed positions — and parses them into typed objects. Because FxReplay paginates trade history, the scraper navigates each page programmatically, polling the table's DOM snapshot until the new page has fully rendered before extracting its rows. A `MutationObserver` watches the account information section reactively; when it detects a mutation indicating a trade has closed, it debounces the extraction to avoid thrashing on rapid changes, then triggers a full sync.

The tradeoff is brittleness — if FxReplay restructures their markup, selectors break. That's a known and accepted risk. All extraction logic lives in a single isolated module, so any breakage has exactly one place to fix.

### Forcing the active tab for initial data extraction

Chrome throttles background tabs to conserve resources — JavaScript runs at lower priority, timers get slowed to roughly one-second intervals, and DOM updates are minimized. For most extensions this doesn't matter. For Rewynd it did: the initial sync navigates paginated tables and waits for DOM updates to settle, so running it in a background tab made the whole process significantly slower.

The fix was to bring the tab into the foreground before pulling data. The extension calls `chrome.tabs.update(tabId, { active: true })`, waits for the tab to become active, runs the full extraction at normal priority, then returns to the extension tab. The tab switch is brief enough to be imperceptible in practice.

The tradeoff is a small interruption to the user's workflow. It's acceptable because the sync only happens once per session — the MutationObserver handles everything after that without needing foreground access.
