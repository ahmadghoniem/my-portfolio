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
video: "serialblocks.webm"
ctas:
  - label: "View online"
    href: "https://serialblocks-app.vercel.app/"
  - label: "Read more"
    href: "/projects/serialblocks"
order: 2
github: "https://github.com/Serialblocks"
---
For my graduation project as an electrical engineering student, our team was set on retrofitting a mechanical UTM with digital instrumentation. We hit a wall early: funding for the necessary components never came through.

We weren’t going to show up empty-handed. If we couldn’t build the system, we’d build its interface.

The original plan was to rely on C# Windows Forms — functional, but limiting. You’re largely constrained by what the framework allows. I saw a better path. With a background in web development, I knew the browser offered far more flexibility in how you shape and present data.

So instead of depending on a desktop tool, I built one from scratch. Within 48 hours, I had a working prototype: a full-stack React and Node.js app using Socket.IO to stream real-time serial data from a microcontroller into a live browser chart.

It had real potential beyond a prototype. That became SerialBlocks: a tool that lets you read from and write to hardware connected to any machine on your network — all from a browser tab.

## Getting started

SerialBlocks has two parts: the app, which runs in your browser, and a local server that runs on the machine your hardware is connected to.
![Getting started diagram](/src/assets/projects/serialblocks/getting_started_diagram.svg)

To help you get up and running, there's a starter repository with example MCU code for both STM32 and Arduino UNO — covering how to structure your serial output so SerialBlocks can parse it correctly.

## How it works


Data moves through three layers. The microcontroller reads a sensor value, serializes it to JSON, and writes it to the UART buffer. The local server receives it over USB, parses it line by line, and emits it over a WebSocket. The browser picks it up, runs it through Immer and Zustand, and updates only the blocks that need to change.

![How it works diagram](/src/assets/projects/serialblocks/how_it_works_diagram.svg)

Writing flows in the reverse direction. When a user interacts with a block—such as toggling an LED or setting an RGB value—the block triggers writeToPort(), which sends the command through a WebSocket to the local server. The server then appends an end-of-line (EOL) character and forwards it to the serial port. On the microcontroller side, the UART interrupt handler receives the data, parses it, and executes the corresponding action. A simple command like LED_TOGGLE is enough to flip a pin state.

## Technical highlights

### Granular re-renders with Zustand selectors and Immer

With sensor data arriving every second, the naive approach would re-render the entire dashboard on every update. SerialBlocks avoids this with two layers working together.

![Granular re-renders diagram](/src/assets/projects/serialblocks/granular_rerenders_diagram.svg)

Zustand selectors — Each block subscribes only to its own slice of state.

Immer `produce()` — When the microcontroller sends a value that hasn't changed, Immer detects it and returns the same object reference. Zustand sees no change and skips the re-render entirely.

The two layers are both necessary. A selector alone won't prevent a re-render if the state writer keeps producing new object references. Immer alone won't prevent a block from re-rendering when an unrelated block's data changes.

### Per-client SerialPort instances

![Per-client SerialPort diagram](/src/assets/projects/serialblocks/per_client_diagram.svg)

Most web-based serial monitors rely on a single shared serial connection on the server. SerialBlocks takes a different approach: each `Socket.IO` connection is assigned its own dedicated `SerialPort` instance, scoped to that client’s connection lifecycle.

When a client connects, it sends its full configuration—port path, baud rate, delimiter, and EOL character—through Socket.IO `handshake.auth`. The server uses this to instantiate a SerialPort bound exclusively to that socket. When the connection closes, the instance is discarded. There is no global serial state, no shared resource, and no risk of interleaved writes between clients.

Error handling is also isolated per client. If Client A's port fails or disconnects unexpectedly, the server emits the error only to that client's socket, while broadcasting a notification to all other connected clients. Client B continues operating normally.

### Cross-tab state sync with `use-broadcast-ts`

Cross-tab state sync is handled with `use-broadcast-ts`. In SerialBlocks, user preferences like server URL, display name, port config, and theme must stay consistent across all open tabs—otherwise one tab could end up connected to a stale endpoint.

The User store wraps Zustand with `shared()` from `use-broadcast-ts`, which uses the browser's Broadcast Channel API. Any update—theme, identity, or server URL—is instantly broadcast to all tabs under the same origin, with no polling, storage events, or manual sync logic. persist still handles localStorage separately to preserve state across refreshes.

In practice, changing the server URL in one tab immediately triggers a Socket.IO reconnect in all others, keeping every client in sync on identity and connection state.
