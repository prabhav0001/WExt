# WA Sender Pro Ultimate - AI Coding Instructions

## Project Overview
This is a **Chrome Extension (Manifest V3)** designed for bulk JavaScript-based automation on `web.whatsapp.com`. The extension allows users to upload contacts, compose rich-text messages, and send them automatically with random delays.

## Architecture & Data Flow
- **Popup (`popup.html`/`popup.js`)**: Handles user input, file parsing (CSV), message composition, and initial settings. It does **not** send messages directly. It commits the "job" to `chrome.storage.local`.
- **Content Script (`content.js`)**: Runs on `web.whatsapp.com`. It reads job data from storage, manages the sending loop, operates the injected Dashboard UI, and interacts with the WhatsApp DOM.
- **State Management**: The "source of truth" is `chrome.storage.local`. Flags like `status`, `pendingData`, and `broadcastHistory` sync the extension state across contexts.

## Critical Patterns & Conventions

### 1. The "Shield" Mechanism (Throttling Prevention)
To prevent the browser from throttling `content.js` when the tab is in the background, the code uses a "Shield" pattern:
- Creates an `AudioContext` with a silent oscillator.
- Creates a `<canvas>` refreshing at 1fps.
- Captures the canvas stream to a Picture-in-Picture (`<video>`) element.
**Do not remove or refactor this without understanding browser background timer throttling.**
*Reference: `activateShield()` in `content.js`*

### 2. Dashboard Injection
The progress UI is not just in the popup; `content.js` injects a floating dashboard (`div#ext-dashboard`) directly into the WhatsApp Web DOM.
- Use `updateDashboard()` helper to modify this UI.
- Ensure Z-indices (`z-index: 99999`) prevent conflicts with WhatsApp elements.

### 3. Message Sending Logic
- **HTML to WhatsApp Markdown**: The popup allows HTML contenteditable input. `convertHtmlToWhatsApp()` (in `popup.js`) converts `<b>` to `*text*`, `<i>` to `_text_`, etc.
- **DOM Interaction**: The sending logic relies on specific DOM selectors (often fragile).
- **Stop/Pause Flags**: Global variables `isPaused` and `isStopped` in `content.js` are critical for the "Kill Switch" functionality. Always check these flags in loops.

### 4. Input Handling
- **Placeholders**: Supports dynamic text replacement (e.g., `{name}`).
- **CSV Parsing**: Handles CSVs with specific structures. Code explicitly handles standardizing phone numbers (removing non-digits, checking length).

## Developer Workflow

### Debugging
- **Popup**: Right-click Extension Icon -> Inspect Popup.
- **Content Script**: Open DevTools (F12) on `web.whatsapp.com`. Look for "Shield Active" or logs starting with "🚀".

### Deployment/Testing
- Manifest V3 constraints apply (no remote code).
- Permissions needed: `activeTab`, `scripting`, `storage`.
- Test target: `https://web.whatsapp.com/*` (requires active WhatsApp session).

## Warnings
- **DOM Fragility**: WhatsApp changes class names frequently. Selectors used in `content.js` for input fields and send buttons are the most likely failure points.
- **Storage Limits**: While `unlimitedStorage` is requested, be mindful of large broadcast history arrays in `chrome.storage.local`.
