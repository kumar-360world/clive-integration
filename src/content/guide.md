# 360 See Live — Iframe & Button Integration Guide

> **By 360 World** — Embed a real-time showroom experience into any website.

This guide explains how to add the **"See It Live in Store"** button and a Picture-in-Picture (PiP) iframe viewer to your website, allowing customers to view physical products in a real showroom via a live video stream.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Authentication](#authentication)
4. [Required Packages](#required-packages)
5. [Architecture](#architecture)
6. [Step 1: The Iframe](#step-1-the-iframe)
7. [Step 2: The "See It Live" Button](#step-2-the-see-it-live-button)
8. [Step 3: PiP Player (Optional Advanced)](#step-3-pip-player-optional-advanced)
9. [Step 3b: Advanced Integration Patterns](#step-3b-advanced-integration-patterns)
10. [Step 4: Listening to PostMessage Events](#step-4-listening-to-postmessage-events)
11. [Practical Examples](#practical-examples)
12. [Step 5: Status Polling](#step-5-status-polling)
13. [Configuration Reference](#configuration-reference)
14. [Error Handling](#error-handling)
15. [Security Considerations](#security-considerations)
16. [Troubleshooting](#troubleshooting)

---

## Overview

The 360 World "See It Live" integration lets your customers watch a live camera feed of a physical product in your showroom. The experience is embedded via an `<iframe>` pointing to a 360 World quick-connect link.

**User flow:**

1. Customer clicks the "See It Live" button on your product page.
2. An iframe opens (modal, PiP, or fullscreen) loading the 360 World link.
3. The customer enters a queue and is connected to a live showroom session.
4. When the session ends, the iframe closes gracefully.

---

## Prerequisites

- A **360 World account** with API access.
- A **Public API Key** (`pk_live_...`) for client-side status checks.
- A **quick-connect link** for each product (created via the 360 World dashboard or Secret API Key — see the [360 See Live Link Management Guide](./360-See-Live-Link-Management.md)).
- Your website must serve over **HTTPS** (required for iframe embedding).

---

## Authentication

The 360 World API uses API key-based authentication. **For the "See It Live" button, you only need the Public API Key.**

| Auth Type                       | Header                   | Use Case                                                                                                                                         |
| ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Public API Key (`pk_live_`)** | `x-api-key: pk_live_...` | **Browser-embedded widgets.** Read-only status checks via `GET /see-live/:id`. Origin-restricted.                                                |
| **Secret API Key (`sk_live_`)** | `x-api-key: sk_live_...` | Server-to-server link management (create/update/delete/toggle). See the [360 See Live Link Management Guide](./360-See-Live-Link-Management.md). |

### Key Separation Rules

- **Endpoints are split by key type.** `pk_live_` can **only** access the `GET /see-live/:id` route. `sk_live_` can **only** access the management routes (`POST`, `PUT`, `PATCH`, `DELETE` under `/see-live/`).
- `pk_live_` keys are safe to embed in frontend code but **must** be restricted by allowed origins (configured when the key is created).
- **Origin validation:** When a browser request includes an `Origin` header, the gateway validates it against the key's `AllowedOrigins`. Requests from disallowed origins receive `403 Forbidden`. Requests without an `Origin` header (e.g. server-side or curl) are allowed.
- **No `user_id` required:** The gateway derives the acting user from the validated API key automatically.

---

## Required Packages

For a basic modal integration, no extra packages are needed — just HTML and CSS.

For the advanced PiP (draggable/resizable) experience shown below:

| Package         | Version | Purpose                          |
| --------------- | ------- | -------------------------------- |
| `react`         | ^18.x   | UI framework                     |
| `react-dom`     | ^18.x   | Portal rendering                 |
| `react-rnd`     | ^10.x   | Draggable + resizable PiP window |
| `framer-motion` | ^12.x   | Animations & transitions         |
| `lucide-react`  | ^0.4x   | Icons                            |
| `zustand`       | ^5.x    | Global PiP state management      |

Install (npm):

```bash
npm install react-rnd framer-motion lucide-react zustand
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Your Website                               │
│                                             │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │ Product Page  │    │  PiP State Store  │  │
│  │              │    │  (Zustand)        │  │
│  │ [See It Live]│───▶│  active, link,    │  │
│  │   Button     │    │  mode, session    │  │
│  └──────────────┘    └────────┬──────────┘  │
│         │                     │              │
│         │ pk_live_ key        │              │
│         ▼                     │              │
│  ┌──────────────┐  ┌─────────▼───────────┐  │
│  │ Status Poll  │  │   PiP Player        │  │
│  │ GET /see-live│  │  (Portal to body)   │  │
│  │  /{link_id}  │  │                     │  │
│  └──────────────┘  │  ┌───────────────┐  │  │
│                    │  │   <iframe>    │  │  │
│                    │  │  360world.com │  │  │
│                    │  └───────────────┘  │  │
│                    └─────────────────────┘  │
│                               ▲              │
│                               │ postMessage  │
│                    ┌──────────┴──────────┐   │
│                    │  360 World Server   │   │
│                    │  (live video feed)  │   │
│                    └─────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Step 1: The Iframe

The core of the integration is an iframe pointing to your 360 World quick-connect link.

### Basic HTML

```html
<iframe
  id="showroom-iframe"
  src="https://web.360world.com/seelive/?deep_link_sub1=quickconnectlink&deep_link_sub2=YOUR_LINK_ID"
  title="Live Showroom"
  style="width: 100%; height: 100%; border: none;"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking; fullscreen"
  allowfullscreen
  referrerpolicy="no-referrer-when-downgrade"
></iframe>
```

### React Component

```tsx
interface ShowroomIframeProps {
  link: string;
  productName: string;
  onLoad?: () => void;
}

const ShowroomIframe = ({ link, productName, onLoad }: ShowroomIframeProps) => (
  <iframe
    src={link}
    title={`${productName} — Live Showroom`}
    style={{ width: "100%", height: "100%", border: "none" }}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking; fullscreen"
    allowFullScreen
    referrerPolicy="no-referrer-when-downgrade"
    onLoad={onLoad}
  />
);
```

> **Important:** Always keep the iframe mounted once opened. Removing and re-adding the iframe resets the session. Use CSS (`visibility`, `display`, `transform`) to hide/show it instead.

---

## Step 2: The "See It Live" Button

### Simple Button

```tsx
interface SeeLiveButtonProps {
  showroomLink: string;
  productName: string;
  onActivate: (link: string, productName: string) => void;
}

const SeeLiveButton = ({
  showroomLink,
  productName,
  onActivate,
}: SeeLiveButtonProps) => {
  if (!showroomLink) return null;

  return (
    <button
      onClick={() => onActivate(showroomLink, productName)}
      className="see-it-live-button"
    >
      {/* Live indicator dot */}
      <span className="live-dot">
        <span className="live-dot-ping" />
        <span className="live-dot-core" />
      </span>
      ▶ See It Live in Store
    </button>
  );
};
```

### CSS for the button

```css
.see-it-live-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 9999px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.4);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.see-it-live-button:hover {
  transform: scale(1.05);
  box-shadow: 0 14px 40px -10px rgba(99, 102, 241, 0.5);
}

.live-dot {
  position: relative;
  width: 12px;
  height: 12px;
}

.live-dot-ping {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: white;
  opacity: 0.75;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.live-dot-core {
  position: relative;
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
}

@keyframes ping {
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}
```

---

## Step 3: PiP Player (Optional Advanced)

For a draggable, resizable Picture-in-Picture experience, use the following architecture.

### 3a. Global State Store (Zustand)

```ts
// stores/pipStore.ts
import { create } from "zustand";

type SessionState = "loading" | "in_queue" | "live" | "ended";
type PipMode = "pip" | "fullscreen" | "minimized";

interface PipState {
  active: boolean;
  link: string;
  productName: string;
  sessionState: SessionState;
  mode: PipMode;

  activate: (link: string, productName: string) => void;
  deactivate: () => void;
  setSessionState: (state: SessionState) => void;
  setMode: (mode: PipMode) => void;
}

export const usePipStore = create<PipState>((set) => ({
  active: false,
  link: "",
  productName: "",
  sessionState: "loading",
  mode: "pip",

  activate: (link, productName) =>
    set({
      active: true,
      link,
      productName,
      sessionState: "loading",
      mode: "pip",
    }),
  deactivate: () =>
    set({
      active: false,
      link: "",
      productName: "",
      sessionState: "loading",
      mode: "pip",
    }),
  setSessionState: (sessionState) => set({ sessionState }),
  setMode: (mode) => set({ mode }),
}));
```

### 3b. PiP Player Component

```tsx
// components/PipPlayer.tsx
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { usePipStore } from "../stores/pipStore";

export const PipPlayer = () => {
  const { active, link, productName, mode, deactivate, setMode } =
    usePipStore();

  if (!active) return null;

  const isFullscreen = mode === "fullscreen";
  const isMinimized = mode === "minimized";

  const rndPosition = isFullscreen
    ? { x: 0, y: 0 }
    : isMinimized
      ? { x: window.innerWidth - 320, y: window.innerHeight - 60 }
      : { x: window.innerWidth * 0.1, y: window.innerHeight * 0.1 };

  const rndSize = isFullscreen
    ? { width: window.innerWidth, height: window.innerHeight }
    : isMinimized
      ? { width: 300, height: 50 }
      : { width: window.innerWidth * 0.8, height: window.innerHeight * 0.8 };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <Rnd
        bounds="parent"
        position={rndPosition}
        size={rndSize}
        disableDragging={isFullscreen || isMinimized}
        enableResizing={!isFullscreen && !isMinimized}
        style={{
          pointerEvents: "auto",
          borderRadius: isFullscreen ? 0 : 12,
          overflow: "hidden",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: "#1a1a2e",
            color: "white",
            cursor: "grab",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {productName} — Live Showroom
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setMode(isFullscreen ? "pip" : "fullscreen")}
            >
              {isFullscreen ? "↙" : "⛶"}
            </button>
            <button onClick={() => setMode(isMinimized ? "pip" : "minimized")}>
              {isMinimized ? "↗" : "—"}
            </button>
            <button onClick={deactivate}>✕</button>
          </div>
        </div>

        {/* Iframe — always mounted */}
        {!isMinimized && (
          <iframe
            src={link}
            title={`${productName} Showroom`}
            style={{
              width: "100%",
              height: "calc(100% - 44px)",
              border: "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; xr-spatial-tracking; fullscreen"
            allowFullScreen
          />
        )}
      </Rnd>
    </div>,
    document.body,
  );
};
```

### 3c. Mount Globally

```tsx
// App.tsx or layout
import { PipPlayer } from "./components/PipPlayer";

function App() {
  return (
    <>
      {/* Your routes/pages */}
      <PipPlayer />
    </>
  );
}
```

**Key rules for the PiP:**

- **Always render via a portal** (`createPortal` to `document.body`) so it persists across page navigation.
- **Use `position: fixed`** on the outer container so it stays pinned to the viewport on scroll.
- **Never unmount the iframe** during mode transitions (fullscreen ↔ pip ↔ minimized). Toggle visibility with CSS.
- **Use `bounds="parent"`** on `Rnd` with the fixed container as the parent for correct drag constraints.

---

## Step 3b: Advanced Integration Patterns

### Handling All States and Orientation

```tsx
interface SessionData {
  state: string;
  orientation: string;
  queuePosition?: number;
  errorCode?: string;
  errorMessage?: string;
}

const [sessionData, setSessionData] = useState<SessionData>({
  state: "loading",
  orientation: "landscape",
});

useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    const msg = event.data;
    if (!msg || msg.source !== "360world-app") return;

    setSessionData((prev) => ({
      ...prev,
      state: msg.data?.state || prev.state,
      orientation: msg.data?.orientation || prev.orientation,
      queuePosition: msg.data?.queuePosition,
      errorCode: msg.data?.errorCode,
      errorMessage: msg.data?.errorMessage,
    }));

    // Example: Show UI based on state
    switch (msg.data?.state) {
      case "loading":
        console.log("Initializing...");
        break;
      case "validation_failed":
        if (msg.data?.errorCode === "LINK_EXPIRED") {
          // Show "Link Expired" UI
        } else if (msg.data?.errorCode === "BUSINESS_OFFLINE") {
          // Show "Business Offline" UI
        }
        break;
      case "waiting_in_queue":
        console.log(`Position in queue: ${msg.data?.queuePosition}`);
        break;
      case "in_call":
        console.log("Call is live!");
        break;
      case "ended":
        console.log(`Session ended. Reason: ${msg.data?.reason}`);
        // Redirect after delay
        setTimeout(() => {
          if (msg.data?.redirectUrl) {
            window.location.href = msg.data.redirectUrl;
          }
        }, 5000);
        break;
      case "error":
        console.error(
          `Error: [${msg.data?.errorCode}] ${msg.data?.errorMessage}`,
        );
        break;
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);

// Adapt UI based on orientation
const containerClass =
  sessionData.orientation === "portrait" ? "flex-col" : "flex-row";
```

### Building a Status Indicator

```tsx
function SessionStatusIndicator() {
  const [status, setStatus] = useState({
    state: "loading" as const,
    orientation: "landscape" as const,
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source !== "360world-app") return;
      setStatus({
        state: event.data.data?.state || status.state,
        orientation: event.data.data?.orientation || status.orientation,
      });
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const stateConfig = {
    loading: { color: "gray", label: "Initializing..." },
    validating: { color: "blue", label: "Checking availability..." },
    validation_failed: { color: "red", label: "Unavailable" },
    joining_queue: { color: "blue", label: "Joining queue..." },
    waiting_in_queue: { color: "yellow", label: "In queue..." },
    director_available: { color: "green", label: "Connecting..." },
    in_call: { color: "green", label: "Live" },
    call_ending: { color: "orange", label: "Ending..." },
    ended: { color: "gray", label: "Session ended" },
    error: { color: "red", label: "Error" },
  };

  const config = stateConfig[status.state as keyof typeof stateConfig];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: config?.color,
          animation: config?.color === "green" ? "pulse 2s infinite" : "none",
        }}
      />
      <span>{config?.label}</span>
      <span style={{ fontSize: 12, opacity: 0.7 }}>({status.orientation})</span>
    </div>
  );
}
```

---

## Step 4: Listening to PostMessage Events

The 360 World iframe sends `postMessage` events to the parent window to communicate session state changes and **video frame dimensions**. Listen for these events to resize your iframe responsively.

### Message Format

All messages follow this structure:

```ts
interface IframeMessage {
  source: "360world-app"; // Message source identifier
  event: string; // Event type
  timestamp: string; // ISO 8601 timestamp
  version: "2.0"; // Message format version
  data: {
    linkId?: string; // Quick-connect link ID
    state?: string; // Current session state
    orientation?: string; // Device orientation: "portrait", "landscape", or "square"
    videoAR?: string; // Video aspect ratio: "portrait", "landscape", or "square"
    errorCode?: string; // Error code (if applicable)
    errorMessage?: string; // Human-readable error message
    // ... additional event-specific fields
  };
}
```

### Basic Event Listener

```ts
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    const msg = event.data;
    if (!msg || msg.source !== "360world-app") return;

    console.log(`Event: ${msg.event}, State: ${msg.data?.state}`);

    // Get video aspect ratio
    if (msg.data?.videoAR) {
      console.log(`Video aspect ratio: ${msg.data.videoAR}`);

      // Resize your iframe based on aspect ratio
      // e.g., apply CSS class or update container dimensions
      applyVideoARClass(msg.data.videoAR);
    }

    switch (msg.event) {
      case "state_changed":
        // Session state has changed (new unified event)
        handleStateChange(msg.data?.state, msg.data);
        break;

      case "orientation_changed":
        // Video aspect ratio changed
        console.log("Video AR:", msg.data?.videoAR);
        break;

      case "error":
        // An error occurred
        console.error(
          `Error [${msg.data?.errorCode}]: ${msg.data?.errorMessage}`,
        );
        break;

      // Legacy events (still supported for backwards compatibility)
      case "join_queue":
      case "call_started":
      case "session_ended":
        console.log("Legacy event:", msg.event);
        break;
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);
```

### Video Frame Dimensions

When a video call is active, the iframe sends **video frame dimensions** in every `orientation_changed` event and state update. This allows the parent to:

- **Adapt iframe layout** based on video aspect ratio
- **Maintain proper aspect ratio** regardless of screen rotation
- **Switch between portrait/landscape layouts** as director adjusts camera

**Example: Responsive Iframe Sizing**

```tsx
const [videoAR, setVideoAR] = useState<string>("landscape");

useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    const msg = event.data;
    if (!msg || msg.source !== "360world-app") return;

    if (msg.data?.videoAR) {
      setVideoAR(msg.data.videoAR);
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);

// Apply CSS class based on aspect ratio
const containerClass =
  videoAR === "portrait"
    ? "aspect-[9/16]"
    : videoAR === "square"
      ? "aspect-square"
      : "aspect-video"; // landscape (16:9)

// Or use dynamic styles
const containerStyle = {
  aspectRatio:
    videoAR === "portrait" ? "9/16" : videoAR === "square" ? "1/1" : "16/9",
  width: "100%",
  maxWidth: "800px",
};
```

---

---

### Session States

| State                | Description                                 | Notes                                   |
| -------------------- | ------------------------------------------- | --------------------------------------- |
| `loading`            | Initial page load, checking authentication  |                                         |
| `validating`         | Validating link, checking availability      |                                         |
| `validation_failed`  | Link expired, business offline, or invalid  | Includes `errorCode` and `errorMessage` |
| `joining_queue`      | Attempting to join the queue                | Optimistic state                        |
| `waiting_in_queue`   | Successfully in queue, waiting for director | Includes `queuePosition`                |
| `director_available` | Director is available, connecting           | Pre-call state                          |
| `in_call`            | Active video call in progress               |                                         |
| `call_ending`        | Call is being terminated                    | Graceful exit state                     |
| `ended`              | Session concluded                           | Final state                             |
| `error`              | Unrecoverable error occurred                | Includes `errorCode` and `errorMessage` |

### Error Codes

When an error occurs, the message includes an error code for programmatic handling:

| Error Code         | Meaning                                      | Action                              |
| ------------------ | -------------------------------------------- | ----------------------------------- |
| `INVALID_LINK`     | Link ID is malformed or not found            | Check link configuration            |
| `LINK_EXPIRED`     | Link has expired                             | Contact business or regenerate link |
| `BUSINESS_OFFLINE` | Business/showroom is not currently available | Retry later or contact business     |
| `INVALID_ACCOUNT`  | User account issue                           | Check user permissions              |
| `JOIN_FAILED`      | Failed to join queue                         | Retry or check network              |
| `CALL_FAILED`      | Call connection failed or dropped            | Check internet connection           |
| `FEATURE_DISABLED` | CSQ feature is not enabled                   | Contact system administrator        |
| `AUTH_FAILED`      | Authentication error                         | Try logging out and in again        |
| `INTERNAL_ERROR`   | Unexpected server error                      | Retry or contact support            |

### Device Orientation

All messages include the current device orientation. Use this to adapt your UI:

```ts
function handleStateChange(state: string, data: any) {
  const { orientation } = data;

  if (orientation === "portrait") {
    // Stack video on top, controls below
  } else if (orientation === "landscape") {
    // Side-by-side layout
  } else if (orientation === "square") {
    // Centered video with controls around
  }
}
```

### Complete Event Reference

#### state_changed — Primary State Change Event

Sent whenever the session state changes (new unified format):

```ts
{
  source: "360world-app",
  event: "state_changed",
  timestamp: "2024-01-15T10:23:45.123Z",
  version: "2.0",
  data: {
    state: "waiting_in_queue" | "in_call" | "ended" | "error" | ...,
    linkId: "2604487959503699968",
    orientation: "portrait" | "landscape" | "square",
    // State-specific fields:
    queuePosition?: number,           // For waiting_in_queue
    contextName?: string,             // Product/context name
    contextUrl?: string,              // Product context URL
    redirectUrl?: string | null,      // Where to redirect on end
    reason?: string,                  // Exit reason for ended state
    errorCode?: string,               // For error state
    errorMessage?: string             // For error state
  }
}
```

#### orientation_changed — Video Aspect Ratio Changed

Sent when video aspect ratio changes:

```ts
{
  source: "360world-app",
  event: "orientation_changed",
  timestamp: "2024-01-15T10:24:12.456Z",
  version: "2.0",
  data: {
    videoAR: "landscape",
    linkId: "2604487959503699968"
  }
}
```

#### error — Error Event

Sent when an unrecoverable error occurs:

```ts
{
  source: "360world-app",
  event: "error",
  timestamp: "2024-01-15T10:23:50.789Z",
  version: "2.0",
  data: {
    state: "error",
    errorCode: "LINK_EXPIRED" | "BUSINESS_OFFLINE" | ...,
    errorMessage: "This link has expired.",
    linkId: "2604487959503699968",
    orientation: "portrait"
  }
}
```

#### Legacy Events (Backwards Compatible)

For backwards compatibility, these legacy events are still sent:

| Event           | Data                              | Notes                         |
| --------------- | --------------------------------- | ----------------------------- |
| `join_queue`    | `{ linkId, position }`            | Fired when viewer joins queue |
| `call_started`  | `{ linkId }`                      | Fired when call begins        |
| `session_ended` | `{ reason, linkId, redirectUrl }` | Fired when session ends       |

**Recommendation:** Use the new `state_changed` event for new integrations. Legacy events will continue to work but may be deprecated in future versions.

---

## Practical Examples

### Responsive Iframe with Video Aspect Ratio

This example shows how to resize your iframe based on video aspect ratio:

```tsx
import { useEffect, useState } from "react";

export function ResponsiveVideoContainer() {
  const [videoAR, setVideoAR] = useState<string>("landscape");
  const [iframeUrl, setIframeUrl] = useState<string>("");

  useEffect(() => {
    // Set iframe URL
    setIframeUrl(
      "https://web.360world.com/seelive/?deep_link_sub2=YOUR_LINK_ID",
    );

    // Listen for video aspect ratio changes
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.source !== "360world-app") return;

      // Capture video aspect ratio when it changes
      if (msg.data?.videoAR) {
        setVideoAR(msg.data.videoAR);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Set aspect ratio based on video AR
  const getAspectRatio = () => {
    switch (videoAR) {
      case "portrait":
        return "9 / 16";
      case "square":
        return "1 / 1";
      default:
        return "16 / 9"; // landscape
    }
  };

  const containerStyle = {
    width: "100%",
    maxWidth: "800px",
    aspectRatio: getAspectRatio(),
  };

  return (
    <div
      style={{
        ...containerStyle,
        overflow: "hidden",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        transition: "all 300ms ease-out",
      }}
    >
      <iframe
        src={iframeUrl}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
```

---

Before showing the "See It Live" button, check if the showroom link is currently active and available using your **Public API Key (`pk_live_`)**.

### API Endpoint

```
GET https://360world.com/api/expert-finder-service/see-live/{quick_connect_link_id}
Headers:
  x-api-key: pk_live_YOUR_PUBLIC_KEY
```

> **Note:** This is the **only** endpoint accessible with a `pk_live_` key. It cannot be called with `sk_live_` keys, and `pk_live_` keys cannot access any management endpoints.

### Response DTO (`SeeLiveQuickConnectLinkResponse`)

```json
{
  "success": true,
  "message": "Link is active",
  "quick_connect_link_id": "2604487959503699968",
  "context_name": "Product Name",
  "context_url": "https://yoursite.com/product/123",
  "is_available": true,
  "is_queue_system": true,
  "quick_connect_link_url": "https://links.360world.com/pT0r/abcd1234?deep_link_sub1=quickconnectlink&deep_link_sub2=2604487959503699968",
  "redirect_url": "https://yoursite.com/thank-you",
  "link_status": "ACTIVE"
}
```

### Extracting the Link ID

The `deep_link_sub2` query parameter in your showroom URL is the link ID:

```ts
function extractLinkId(url: string): string | null {
  try {
    return new URL(url).searchParams.get("deep_link_sub2");
  } catch {
    return null;
  }
}
```

### Polling Example (Direct Client-Side)

Since `pk_live_` keys are safe for browser use, you can call the API directly from your frontend:

```ts
const POLL_INTERVAL = 15000; // 15 seconds
const PUBLIC_KEY = "pk_live_YOUR_PUBLIC_KEY";

function useShowroomStatus(showroomUrl: string | null) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const linkId = showroomUrl ? extractLinkId(showroomUrl) : null;

  useEffect(() => {
    if (!linkId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `https://360world.com/api/expert-finder-service/see-live/${linkId}`,
          {
            headers: { "x-api-key": PUBLIC_KEY },
          },
        );
        const data = await res.json();
        setIsAvailable(
          data.success && data.is_available && data.link_status === "ACTIVE",
        );
      } catch {
        setIsAvailable(null); // graceful fallback — show button
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [linkId]);

  return isAvailable;
}
```

### Polling Example (Via Server Proxy)

If you prefer not to expose your `pk_live_` key in client code, proxy through your server:

```ts
function useShowroomStatus(showroomUrl: string | null) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const linkId = showroomUrl ? extractLinkId(showroomUrl) : null;

  useEffect(() => {
    if (!linkId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch("YOUR_SERVER_PROXY_URL", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", link_id: linkId }),
        });
        const data = await res.json();
        setIsAvailable(
          data.success && data.is_available && data.link_status === "ACTIVE",
        );
      } catch {
        setIsAvailable(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [linkId]);

  return isAvailable;
}
```

> **Tip:** Default to showing the button if the status check fails. Never block the user from the feature due to a polling error.

---

## Configuration Reference

| Setting          | Default            | Description                             |
| ---------------- | ------------------ | --------------------------------------- |
| `deep_link_sub2` | —                  | The quick-connect link ID (required)    |
| `deep_link_sub1` | `quickconnectlink` | Link type identifier                    |
| Polling interval | 15000ms            | How often to check link availability    |
| Snap threshold   | 30px               | PiP snaps to edges within this distance |
| Min PiP width    | 40% of viewport    | Minimum resize width                    |

---

## Error Handling

| HTTP Status | Meaning                    | Action                                                                                                   |
| ----------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `200`       | Success                    | Parse response JSON normally                                                                             |
| `401`       | Invalid or missing API key | Verify your `pk_live_` key is correct and not revoked                                                    |
| `403`       | Origin not allowed         | Your domain is not in the key's `AllowedOrigins` list. Contact your 360 World account manager to add it. |
| `404`       | Link ID not found          | The quick-connect link may have been deleted or expired                                                  |
| `429`       | Rate limited               | Implement exponential backoff on polling                                                                 |
| `500+`      | Server error               | Retry with backoff; show button as fallback                                                              |

---

## Security Considerations

1. **HTTPS required** — Iframes with live media require a secure context.
2. **Origin validation** — When listening to `postMessage`, always check `msg.source === "360world-app"`.
3. **API key separation** — Use your **Public API Key (`pk_live_`)** for status polling (client-side safe, origin-restricted). Use your **Secret API Key (`sk_live_`)** only on the server for link management (create/update/delete). These keys **cannot** access each other's endpoints.
4. **No `user_id` needed** — The API gateway derives the acting user from the API key. Do not send `user_id` in requests.
5. **CSP headers** — Ensure your Content Security Policy allows `frame-src` from `*.360world.com`.
6. **AllowedOrigins** — Configure your `pk_live_` key's allowed origins to restrict which domains can use it. Requests from browsers on disallowed origins will receive `403`.

---

## Troubleshooting

| Issue                                | Cause                                      | Fix                                                                                  |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Iframe is blank                      | `position: fixed` on `Rnd` directly        | Wrap `Rnd` in a fixed container, use `bounds="parent"`                               |
| Iframe resets on fullscreen toggle   | Iframe unmounted/remounted                 | Keep iframe always mounted; toggle size/position only                                |
| Button not appearing                 | Status API returning `is_available: false` | Check link status in 360 World dashboard                                             |
| PiP scrolls with page                | Not using fixed positioning                | Use a `position: fixed; inset: 0` wrapper                                            |
| PostMessages not received            | Missing origin check or wrong listener     | Verify `msg.source === "360world-app"` in your handler                               |
| `403 Forbidden` on status check      | Origin not in AllowedOrigins               | Add your domain to the `pk_live_` key's allowed origins                              |
| `401 Unauthorized`                   | Invalid or revoked API key                 | Regenerate key from your 360 World account                                           |
| Not receiving `state_changed` events | Still expecting legacy events              | Ensure your listener handles `state_changed` event type                              |
| Orientation not detected             | Window not resizing                        | Desktop may not trigger resize events; check `msg.data?.orientation` in other events |

### Integration Checklist

- ✅ Verify `msg.source === "360world-app"` in all message handlers
- ✅ Handle both `state_changed` (new) and legacy events (`join_queue`, `call_started`, `session_ended`) for backwards compatibility
- ✅ Check `msg.data?.orientation` to adapt UI for portrait/landscape
- ✅ Parse `errorCode` from error events for programmatic error handling
- ✅ Use `msg.data?.queuePosition` to show queue position updates
- ✅ Respect `msg.data?.redirectUrl` when session ends to redirect users appropriately
- ✅ Monitor `state` transitions to display appropriate UI per state
- ✅ Always validate timestamps (`msg.timestamp`) for duplicate message detection if needed

---

## Minimal Complete Example

Here's a minimal HTML example showing how to handle all the new state messages and orientation changes:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>See It Live Demo</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f5f5f5;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      .status-bar {
        background: white;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }
      .status-dot.loading {
        background: #999;
      }
      .status-dot.waiting {
        background: #fbbf24;
        animation: pulse 2s infinite;
      }
      .status-dot.in_call {
        background: #10b981;
        animation: pulse 1s infinite;
      }
      .status-dot.error {
        background: #ef4444;
      }
      .status-dot.ended {
        background: #999;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      .orientation-badge {
        background: #e0e7ff;
        color: #4f46e5;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 500;
      }
      #showroom-overlay {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.8);
        align-items: center;
        justify-content: center;
      }
      #showroom-overlay.active {
        display: flex;
      }
      #showroom-frame {
        width: 90vw;
        height: 85vh;
        max-width: 1200px;
        border: none;
        border-radius: 12px;
      }
      #close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        background: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .cta-button {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border-radius: 9999px;
        border: none;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.4);
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }
      .cta-button:hover {
        transform: scale(1.05);
        box-shadow: 0 14px 40px -10px rgba(99, 102, 241, 0.5);
      }
      .status-message {
        padding: 12px 16px;
        border-radius: 8px;
        margin: 12px 0;
        font-size: 14px;
      }
      .status-message.info {
        background: #dbeafe;
        color: #1e40af;
      }
      .status-message.warning {
        background: #fef3c7;
        color: #92400e;
      }
      .status-message.error {
        background: #fee2e2;
        color: #7f1d1d;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="status-bar">
        <div>
          <span class="status-dot loading"></span> Status:
          <strong id="status-text">Ready</strong>
        </div>
        <span class="orientation-badge" id="orientation-badge">landscape</span>
      </div>

      <div id="message-area"></div>

      <button class="cta-button" onclick="openShowroom()">
        <span>▶</span> See It Live in Store
      </button>
    </div>

    <div id="showroom-overlay">
      <button id="close-btn" onclick="closeShowroom()">✕</button>
      <iframe
        id="showroom-frame"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowfullscreen
      ></iframe>
    </div>

    <script>
      const SHOWROOM_URL =
        "https://web.360world.com/seelive/?deep_link_sub1=quickconnectlink&deep_link_sub2=YOUR_LINK_ID";

      let sessionState = {
        state: "loading",
        orientation: "landscape",
        queuePosition: null,
        errorCode: null,
        errorMessage: null,
      };

      // State display config
      const stateLabels = {
        loading: "Initializing...",
        validating: "Checking availability...",
        validation_failed: "Unavailable",
        joining_queue: "Joining queue...",
        waiting_in_queue: "In queue...",
        director_available: "Connecting...",
        in_call: "Live call",
        call_ending: "Ending...",
        ended: "Session ended",
        error: "Error",
      };

      function updateStatusUI() {
        const statusText = document.getElementById("status-text");
        const messageArea = document.getElementById("message-area");
        const orientationBadge = document.getElementById("orientation-badge");

        // Update status text
        statusText.textContent =
          stateLabels[sessionState.state] || sessionState.state;
        orientationBadge.textContent = sessionState.orientation;

        // Update status dot class
        const statusDot = document.querySelector(".status-dot");
        statusDot.className = `status-dot ${sessionState.state}`;

        // Show messages
        let messageHTML = "";
        if (
          sessionState.state === "waiting_in_queue" &&
          sessionState.queuePosition
        ) {
          messageHTML = `<div class="status-message info">You are #${sessionState.queuePosition} in queue</div>`;
        } else if (sessionState.state === "error") {
          messageHTML = `<div class="status-message error"><strong>[${sessionState.errorCode}]</strong> ${sessionState.errorMessage}</div>`;
        } else if (sessionState.state === "validation_failed") {
          messageHTML = `<div class="status-message warning"><strong>[${sessionState.errorCode}]</strong> ${sessionState.errorMessage}</div>`;
        }
        messageArea.innerHTML = messageHTML;
      }

      function openShowroom() {
        document.getElementById("showroom-frame").src = SHOWROOM_URL;
        document.getElementById("showroom-overlay").classList.add("active");
      }

      function closeShowroom() {
        document.getElementById("showroom-overlay").classList.remove("active");
        document.getElementById("showroom-frame").src = "";
      }

      window.addEventListener("message", (event) => {
        if (event.data?.source !== "360world-app") return;

        const { data } = event.data;

        // Update session state
        if (data.state) {
          sessionState.state = data.state;
        }
        if (data.orientation) {
          sessionState.orientation = data.orientation;
        }
        if (data.queuePosition !== undefined) {
          sessionState.queuePosition = data.queuePosition;
        }
        if (data.errorCode) {
          sessionState.errorCode = data.errorCode;
        }
        if (data.errorMessage) {
          sessionState.errorMessage = data.errorMessage;
        }

        // Log the event (for debugging)
        console.log(`[360 World Event] ${event.data.event}:`, data);

        // Update UI
        updateStatusUI();

        // Handle state transitions
        switch (data.state) {
          case "in_call":
            console.log("Call started!");
            break;
          case "ended":
            console.log("Session ended");
            // Close iframe after 5 seconds
            setTimeout(() => {
              closeShowroom();
            }, 5000);
            break;
          case "validation_failed":
            closeShowroom();
            break;
          case "error":
            closeShowroom();
            break;
        }

        // Handle orientation changes
        if (event.data.event === "orientation_changed") {
          console.log(`Orientation changed to: ${data.orientation}`);
        }
      });

      // Initialize UI
      updateStatusUI();
    </script>
  </body>
</html>
```

---

_© 360 World — [360world.com](https://360world.com)_
