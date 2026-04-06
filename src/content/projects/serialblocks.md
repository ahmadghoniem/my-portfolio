---
title: "Serial Blocks"
description: >-
  Built in 48 hours as a graduation project proof of concept, now open-source
  for communicating with hardware from the browser.
tags:
  - React
  - Node.js
  - Socket.IO
  - Node SerialPort
  - Zustand
  - ShadcnUI
  - TailwindCSS
image: "serialblocks.jpg"
ctas:
  - label: "View online"
    href: "https://serialblocks-app.vercel.app/"
  - label: "Read more"
    href: "/projects/serialblocks"
order: 2
---

I built SerialBlocks as my graduation project proof of concept — a browser-based serial monitor that lets you read and write to hardware connected to any machine on your network. It started as a 48-hour sprint and turned into something I still use almost daily when working with Arduinos and ESP32s.

The core idea is simple: connect to a serial port from the browser, visualize incoming data in real-time, and send commands back — all without installing native software. The execution required solving some interesting problems around state management, per-client isolation, and cross-tab synchronization.

## Architecture

![Architecture diagram](/src/assets/projects/serialblocks/serialblocks_gettingStarted.svg)

The architecture separates concerns into three distinct layers. The frontend is a React SPA built with Zustand for state management and ShadcnUI for components. The backend runs a Socket.IO server that manages serial connections and broadcasts data to connected clients. Each client's socket connection carries their serial configuration — port path, baud rate, delimiter, and EOL character — as authentication data.

When a client opens a port, the server instantiates a dedicated `SerialPort` object bound to that socket. Data flows from the microcontroller through the serial port, gets parsed on the server, and emits real-time updates to the owning client. The client's Zustand store receives these updates and renders them through a modular block system where each block subscribes only to the data it needs.

## Notable Technical Decisions

### Granular re-renders with Zustand selectors and Immer

![Zustand and Immer diagram](/src/assets/projects/serialblocks/serialblocks_zustand_immer.svg)

With sensor data arriving every second, the naive approach would re-render the entire dashboard on every update. SerialBlocks avoids this with two layers working together.

Each block subscribes to only its own slice of state through a Zustand selector — `useSerialStore(store => store.serialData.humidity)` instead of the whole store. This means when `serialData.humidity` updates, the Humidity block re-renders, and the LED, Processor, and LineChart blocks don't even know an update happened.

The second layer is Immer's `produce()` in the store's `parsedData` handler. When the microcontroller sends a value that hasn't changed — say humidity is still 65 — Immer detects the value is identical and doesn't create a new object reference. Zustand sees the same reference and skips the re-render entirely. The selector handles isolation across blocks; Immer handles the case where the same block receives identical data.

The two layers are both necessary. A selector alone won't prevent a re-render if the state writer keeps producing new object references. Immer alone won't prevent a block from re-rendering when an unrelated block's data changes.

### Per-client SerialPort instances

![Per-client SerialPort diagram](/src/assets/projects/serialblocks/serialblocks_per_client.svg)

Most web-based serial monitors use a single shared serial connection on the server. SerialBlocks takes a different approach: each Socket.IO connection gets its own dedicated `SerialPort` instance, scoped to that client's connection closure.

When a client connects, it sends its full configuration — port path, baud rate, delimiter, EOL character — as Socket.IO handshake auth. The server uses that config to instantiate a `SerialPort` object bound to that specific socket. When the socket closes, the instance is garbage collected. There's no global serial state, no shared resource, no risk of one client's writes interleaving with another's.

Error handling is also scoped per client. If Client A's port errors or disconnects unexpectedly, the server emits the error back to Client A's socket only, then broadcasts a notification to all other connected clients. Client B continues operating normally. The tradeoff is resource usage — N clients means N SerialPort instances — but for a local tool talking to hardware, this is the correct isolation boundary.

### Cross-tab state sync with `use-broadcast-ts`

User preferences in SerialBlocks — server URL, display name, port config, theme — need to stay consistent across every open tab. Without synchronization, changing the server URL in one tab would leave other tabs pointing at a stale connection.

The `UserStore` wraps Zustand with `shared()` from `use-broadcast-ts`, which uses the browser's native Broadcast Channel API. When any tab writes to the store — updating the display name, switching themes, changing the remote URL — the Broadcast Channel broadcasts the change to every other tab with the same origin instantly. No polling, no storage I/O during updates, no manual sync logic. The `persist` middleware handles localStorage separately so state survives page refreshes.

The practical effect: changing the server URL in one tab triggers a Socket.IO reconnect with the new auth in every other tab simultaneously. All clients stay in agreement about who they are and where they're connecting.
