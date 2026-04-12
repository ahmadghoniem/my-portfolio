---
title: "0xCounter"
description: >-
  A global counter on the blockchain. Covers real-time events, on-chain indexing, and ENS resolution all in one minimal dApp.
tags:
  - React
  - Wagmi
  - Viem
  - Supabase
  - Hardhat
  - RainbowKit
  - ShadcnUI
  - TailwindCSS
image: "0xCounter.png"
ctas:
  - label: "View app"
    href: "https://0x-counter.vercel.app/"
  - label: "Read more"
    href: "/projects/0xcounter"
order: 3
github: "https://github.com/ahmadghoniem/0xCounter"
---

Bitcoin was the first thing that got my attention, but Ethereum is what actually pulled me in. Bitcoin was built to move value; Ethereum was built to run programs — you can deploy logic to it that runs exactly as written, with no central authority controlling its execution. That's a fundamentally different thing from what most people picture when they hear "crypto."

The space doesn't make that easy to see. Memecoins, overpriced jpegs, wildly speculative markets — that's what most people associate with blockchain, and it's not hard to see why. I've always wanted to understand how blockchain actually works behind the scenes, so when I had the time I started reading through [Mastering Ethereum](https://masteringethereum.xyz/) — how wallets and signatures work under the hood, how a transaction flows from your wallet all the way to the chain, how a single line in a smart contract can be exploited.

0xCounter came out of wanting to understand how a dApp is built end to end in practice. I went through [Austin Griffith's YouTube series](https://www.youtube.com/watch?v=zuJ-elbo88E&list=PLJz1HruEnenAf80uOfDwBPqaliJkjKg69) and [Cyfrin Updraft](https://updraft.cyfrin.io) to get familiar with the stack and typical tooling, then built one myself to connect the pieces together.

## How it works

The contract is a simple counter — inc() is public and increments by one, incBy() is owner-only and takes a custom amount. Every call emits an Increment event on-chain with the caller's address and amount.

Rather than querying the blockchain directly for historical events on every load — which is slow and doesn't give you pagination or sorting — production apps typically offload this to a dedicated indexer like The Graph. I wanted to build that layer myself, so Supabase acts as the indexed store.

Two systems keep it in sync. A real-time listener catches events as soon as the transaction is confirmed and writes them to Supabase, also showing a notification when the counter is incremented by someone else. useBacklogSync runs on load and fetches any events missed since the last indexed block.

The app is deployed on Sepolia, an Ethereum testnet, so you can interact with it using test ETH without spending real money. Connected wallets are resolved against Sepolia ENS (Ethereum Name Service) — name, avatar, and header image — with a fallback to a truncated address.

## Technical highlights

### WebSocket transport for reliable event listening

Early on, `useWatchCounterIncrementEvent` wasn't firing consistently on Sepolia — events would emit on-chain but the listener wouldn't catch them. Locally on Hardhat everything worked fine.

An RPC (Remote Procedure Call) endpoint is the gateway your app uses to communicate with the blockchain — reading data, sending transactions, and listening for events. The culprit was the default RPC endpoint that MetaMask injects, which is HTTPS-based and relies on polling. Polling is too slow and inconsistent for real-time event listening — it's easy to miss events between poll cycles. The fix was switching to Infura's WebSocket endpoint, which establishes a persistent connection and has the node push events to the client the moment they happen. After that, event listening worked reliably across all networks.
