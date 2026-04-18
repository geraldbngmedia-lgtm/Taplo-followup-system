# Taplo Chrome Extension

Push candidates from Teamtailor into your Taplo nurturing pipeline — with one click.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `chrome-extension` folder
5. The Taplo icon appears in your toolbar

## Setup

1. Click the Taplo extension icon
2. Click the **gear** icon (top-right)
3. Enter your **Taplo Backend URL** (e.g. `https://your-app.preview.emergentagent.com`)
4. Enter your **Extension API Key** (found in Taplo Dashboard → Extension page)
5. Click **Save Settings**

## Usage

1. Navigate to any **candidate profile** in Teamtailor
2. Click the **Taplo extension icon** in your browser toolbar
3. The extension auto-scrapes the candidate's name, email, role, stage, and tags
4. Review and edit the captured data if needed
5. Click **Push to Taplo**
6. The candidate appears in your Taplo pipeline instantly

## How It Works

- **Content Script** (`content.js`): Runs on `*.teamtailor.com` pages. Uses multiple strategies (DOM selectors, label scanning, regex) to extract candidate data.
- **Popup** (`popup.html/js/css`): Shows the captured data in an editable form. Sends it to Taplo via `POST /api/extension/push-candidate`.
- **Background** (`background.js`): Handles extension lifecycle.

## API Endpoint

The extension pushes data to:

```
POST {your-taplo-url}/api/extension/push-candidate
Header: X-Extension-Key: {your-extension-key}
```

## Files

```
chrome-extension/
├── manifest.json      # Extension config (Manifest V3)
├── popup.html         # Popup UI
├── popup.css          # Popup styles (Taplo dark theme)
├── popup.js           # Popup logic
├── content.js         # Page scraper for Teamtailor
├── background.js      # Service worker
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```
