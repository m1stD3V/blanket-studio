# Blanket · Open-source stream overlay studio

A free, open-source StreamElements/Streamlabs replacement for designing custom stream overlays with drag-and-drop positioning, live Twitch chat integration, custom commands, quotes, and one-click OBS export.

**No registration, no server, no installation** — open the builder in a browser, design your overlay, export a single `.html` file, and add it to OBS as a Browser Source.

---

## Quick Start

1. Open `builder/index.html` in any browser
2. Click widgets on the canvas or drag them from the **Widgets** tab
3. Edit properties in the right panel (colors, fonts, size, position)
4. Click **💬 Chat Tools** in the canvas bar to set up Twitch chat
5. Click **Export** in the top bar to generate a `.html` overlay file
6. In OBS, add a **Browser Source**, check **Local file**, select the exported `.html`
7. Set resolution to **1920×1080**, enable **Refresh browser when scene becomes active**

---

## Features

### Widget Library — 15 types

| Category | Widgets |
|----------|---------|
| **Alerts** | Alert Box — follow, sub, resub, raid, bits, donation events with per-event icons, animations, media, and customizable message templates |
| **Chat** | Chat Box — scrollable message display with IRC badges, colors, and display names |
| **Widgets** | Stream Label, Goal Box (with live slider), Countdown, Now Playing, Emote Wall, Credits |
| **Scenes** | BRB, Starting Soon (with countdown), Thanks for Watching |
| **Layers** | Image/GIF, Video (mp4/webm), Text Label (32 Google Fonts), Shape (rectangle, circle, triangle, star, hexagon, diamond, heart) |

### Canvas Editor

- **WYSIWYG canvas** — drag to move, 8-point resize handles, arrow-key nudge (1px / 10px with Shift)
- **Zoom** — 0.25× – 1.5× with auto-fit button (⊡) that fits the canvas to viewport
- **Snap-to-grid** (10px toggleable) with snap-to-keypoints (edges/centers of other widgets, 5px threshold, visual guide lines)
- **Canvas backgrounds** — transparent, dark, light, checkerboard
- **Right-click context menu** — bring to front/back, forward/backward, lock, copy, duplicate, delete
- **Layers panel** — drag-to-reorder widgets, click to select, lock/toggle visibility
- **Undo/Redo** — 40-state history (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)

### Widget Properties

Every widget has three property tabs:

- **Design** — accent color, text color, background color, font, opacity, CSS filters (brightness, contrast, saturation, sepia, hue-rotate, blur), box shadow, border, border-radius, rotation, letter-spacing, text-transform, line-height, text shadow
- **Settings** — widget-specific options (alert type, animation, duration, media; chat box style; label text; goal target/progress; countdown date; etc.)
- **Position** — x/y (% of 1920×1080 canvas), width/height (px), rotation, lock toggle

### Theme Presets

8 one-click color themes that update all widgets: Midnight, Sunset, Forest, Neon, Gold, Ocean, Mono, Retro

### Twitch Chat Integration (Direct IRC)

The exported overlay connects **directly** to Twitch IRC — **no companion app, no server, no extra software**.

- Enter your channel name in the builder's Chat Tools modal
- Export the HTML — the overlay connects to Twitch on page load
- Chat messages appear live in the Chat Box widget with badges, colors, and display names
- Optional: paste a TMI token from [twitchapps.com/tmi](https://twitchapps.com/tmi) to enable chat replies

### Custom Commands

Define commands in the builder that viewers can use in chat:

| Command | Example |
|---------|---------|
| `!discord` | Shows "Join our Discord!" on stream and in chat |
| `!so` | Mod-only shoutout command |
| `!socials` | Displays your social media links |

- Per-command cooldown (seconds)
- **Mod-only** toggle — only moderators/streamer can use the command
- Commands persist via `localStorage` in the browser source

#### Mod Chat Management

Moderators can manage commands live in Twitch chat:

| Chat command | Who | What |
|-------------|-----|------|
| `!command add <name> <response>` | mod | Creates a new command |
| `!command del <name>` | mod | Removes a command |
| `!command edit <name> <new response>` | mod | Updates a command's response |
| `!command list` | anyone | Lists all commands |

### Quotes System

A built-in quote book managed through chat:

| Chat command | Who | What |
|-------------|-----|------|
| `!quote` | anyone | Shows a random quote on stream |
| `!quote N` | anyone | Shows quote #N |
| `!quote count` | anyone | Shows total number of quotes |
| `!quote add <text>` | mod | Adds a new quote |
| `!quote del <id>` | mod | Removes a quote |

Quotes are persisted via `localStorage` and survive browser source refreshes.

### Project Save/Load

- **⬇ Save Project** — downloads `blanket-project.json` with every widget, command, quote, and setting
- **⬆ Load Project** — restores a full project from a `.json` file

### Export Config

In the Chat Tools modal:
- **⬇ Export Config** — downloads commands, quotes, channel, and token as JSON
- **⬆ Import Config** — loads commands/quotes/token from a JSON file

### Live Preview

Type test messages in the **Test chat…** field at the top of the builder to see how commands, quotes, and chat messages appear in real-time. Built-in commands (`!quote`, `!commands`, `!command add`, etc.) work in the preview exactly as they would on stream.

### Export

- **Copy to Clipboard** — copy the exported HTML directly
- **Download .html** — save as a file for OBS Browser Source
- Generated HTML is fully self-contained (CSS, JS, fonts, commands, quotes, IRC client all inline)

---

## File Structure

```
blanket-stream/
├── builder/
│   └── index.html          — The overlay studio (open in browser)
├── elements/
│   ├── alerts.html         — Standalone alert overlay
│   ├── chat.html           — Standalone chat overlay
│   ├── scene-brb.html      — BRB scene
│   ├── scene-starting-soon.html — Starting soon scene
│   ├── scene-thanks.html   — Thanks for watching scene
│   └── widget-nowplaying.html — Now playing widget
├── companion/              — (Legacy) Node.js companion app
│   ├── server.js
│   ├── package.json
│   └── dist/               — Pre-built binaries
├── package.json
├── README.md
└── DOCS.md
```

---

## Browser Compatibility

Works in any modern browser (Chrome, Firefox, Edge, Safari). The builder runs entirely client-side — no server required. The exported overlay uses WebSocket (WSS) to connect to Twitch IRC, supported in the Chromium Embedded Framework used by OBS 28+.

---

## License

MIT — free to use, modify, and distribute. No attribution required.
