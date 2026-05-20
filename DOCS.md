# Blanket Stream Overlay Studio — Documentation

## Table of Contents

1. [Overview](#1-overview)
2. [Builder Interface](#2-builder-interface)
3. [Widgets](#3-widgets)
4. [Canvas & Editing](#4-canvas--editing)
5. [Properties Panel](#5-properties-panel)
6. [Theme System](#6-theme-system)
7. [Twitch Chat Integration](#7-twitch-chat-integration)
8. [Commands System](#8-commands-system)
9. [Quotes System](#9-quotes-system)
10. [Project & Config Management](#10-project--config-management)
11. [Export](#11-export)
12. [OBS Setup](#12-obs-setup)

---

## 1. Overview

Blanket is a fully client-side web application for designing custom Twitch stream overlays. It runs entirely in the browser with no server, no installation, and no registration. Everything — the editor, the preview, and the exported overlay — is a single HTML file.

### Architecture

The builder (`builder/index.html`) is a self-contained single-page application. It uses:
- Vanilla JavaScript (no frameworks)
- CSS custom properties for theming
- WebSocket API for direct Twitch IRC integration in exported overlays
- LocalStorage for persisting commands and quotes in the browser source
- No external dependencies at runtime

### Data Flow

```
Builder (index.html)                 Exported Overlay (blanket-overlay.html)
┌────────────────────┐              ┌────────────────────────────────────┐
│  Design widgets    │  genHTML()   │  Render widgets                    │
│  Set commands      │ ────────────→│  Connect to Twitch IRC (WSS)       │
│  Set quotes        │              │  Listen for chat messages          │
│  Configure channel │              │  Handle commands & quotes          │
│  Export project    │              │  Persist to localStorage           │
└────────────────────┘              └────────────────────────────────────┘
```

---

## 2. Builder Interface

The builder has a three-panel layout:

```
┌──────────────────────────────────────────────────────────────┐
│  Top Bar: Add Widgets │ Test Chat │ Export │ Preview │ ⋮     │
├──────────┬───────────────────────────┬───────────────────────┤
│          │                           │                       │
│  Left    │    Canvas (WYSIWYG)       │    Right Properties   │
│  Panel   │                           │    Panel              │
│          │    Zoom controls          │                       │
│ Widgets  │    Background toggle      │  Design │ Settings    │
│ Layers   │    Snap toggle            │  Position             │
│ Themes   │    💬 Chat Tools          │                       │
│          │                           │                       │
└──────────┴───────────────────────────┴───────────────────────┘
```

### Top Bar

- **Widget palette** — 15 widget types as draggable cards. Click to add to canvas.
- **Test chat** — Type a message and press Enter to test chat display, commands, and quotes in the preview.
- **💬 Chat Tools** — Opens the Chat Tools modal for Twitch setup, commands, and quotes.
- **Export** — Opens the export panel with generated HTML, copy/download, and project save/load.
- **Preview** — Hides panels for a full-canvas preview. Press Escape to exit.

### Left Panel (Tabs)

| Tab | Function |
|-----|----------|
| **Widgets** | Click any widget to add it to the center of the canvas |
| **Layers** | Lists all widgets in z-order. Drag to reorder. Click to select. Shows lock/visibility state |
| **Themes** | 8 preset themes. Click any to apply accent/text/background colors globally |

### Right Panel (Properties)

Shown when a widget is selected. Organised into three sub-tabs.

### Canvas Bar (below top bar)

- Zoom buttons: `.25×` `.5×` `1×` `1.5×` `⊡` (auto-fit)
- Background: ▦ transparent / ● dark / ○ light / ▤ checkers
- ⊞ Snap toggle
- 💬 Chat Tools

---

## 3. Widgets

### 3.1 Common Properties

All widgets share these design properties (exposed in the **Design** tab):

| Property | Description | Range |
|----------|-------------|-------|
| Accent | Primary accent color | color picker |
| Text | Text color | color picker |
| Background | Background fill | color picker + transparent |
| Text C | Alternate text color | color picker |
| Fill | Background fill (shapes, labels) | color picker |
| Stroke | Border line color | color picker |
| Border | Border color | color picker |
| Text Shadow | Text shadow color | color picker |
| Font | Google Font selection | dropdown (32 fonts) |
| Size | Font size | 8–200px |
| Letter spacing | Character spacing | -10–40px |
| Transform | Text transform | dropdown (none/UPPER/lower/Capitalize) |
| Bold | Font weight toggle | checkbox (400 / 700) |
| Opacity | Widget opacity | 0–100% |
| Rotation | Z-axis rotation | -180–180° |
| Blur | Gaussian blur filter | 0–20px |
| Brightness | Brightness filter | 0–200% |
| Contrast | Contrast filter | 0–200% |
| Saturation | Saturation filter | 0–200% |
| Sepia | Sepia filter | 0–100% |
| Hue | Hue rotation filter | 0–360° |
| Radius | Border radius (image, text, shape) | 0–100px |
| Border W | Border width (image, text, shape) | 0–20px |
| Box Shadow | Shadow color picker | color picker |
| Shadow blur | Box shadow blur | 0–60px |
| Shadow X/Y | Box shadow offset | -30–30px |

### 3.2 Widget Types

#### Alert Box

Displays animated stream alerts. Properties:

- **Event type**: follow, sub, resub, raid, bits, donation
- **Animation**: fade, slide-left, slide-right, slide-up, slide-down, bounce, scale, flip
- **Duration**: 1–30 seconds
- **Box shape**: rounded, pill, square, soft
- **Alignment**: left, center, right
- **Show icon**: toggle event icon
- **Message template**: custom text with `{name}` and `{count}` placeholders
- **Media**: optional image/video background per alert
- **Media type**: image or video

**Embedded fonts**: The alert box always uses Inter for the label and title text.

#### Chat Box

Scrollable chat message display with Twitch IRC integration.

- **Max messages**: 3–50 messages before auto-cleanup (default 8)
- **Name size**: Font size for display names (10–48px)
- **Msg size**: Font size for message text (10–48px)
- **Badges**: Twitch badges (mod, sub, VIP, etc.) displayed automatically

The chat box auto-connects to Twitch IRC when the overlay is loaded in OBS (if a channel is configured).

#### Stream Label

A customizable metric display for stream information.

- **Metric**: viewers, followers, or subscribers (dropdown)
- **Format**: custom text with `{metric}` placeholder, e.g. `{metric} viewers`

#### Goal Box

A progress bar for goals (followers, subscribers).

- **Metric**: followers or subscribers (dropdown)
- **Current**: current progress value (0–999999)
- **Target**: goal target value (1–999999)
- **Progress bar**: uses the accent color from Design tab

#### Countdown

A simple countdown timer.

- **Minutes**: countdown duration (1–120 minutes)

#### Now Playing

Displays a static placeholder for current song/artist info (intended for future integration with music bots). No user-configurable settings.

#### Emote Wall

A grid of animated emotes.

- **Emote size**: pixel size (16–160px)
- **Max emotes**: number of emotes visible at once (5–100)

Emotes are randomly selected and animated with floating/breathing effects.

#### Credits

A static credits/collaborators list.

- **Text**: multi-line text (one entry per line)
- **Scroll speed**: scroll duration (1–20, lower = faster)

#### Scene — BRB

A "Be Right Back" intermission screen.

- **Label**: heading text (default: "stream")
- **Subtitle**: secondary text (optional)

#### Scene — Starting Soon

A pre-stream countdown/announcement screen.

- **Label**: heading text (default: "stream")
- **Subtitle**: secondary text (optional)
- **Countdown**: minutes to start (1–60)

#### Scene — Thanks for Watching

An end-of-stream screen.

- **Label**: heading text (default: "stream")
- **Subtitle**: secondary text (optional)

#### Image

Displays an image or GIF.

- **Source**: Browse button or paste image URL
- **Object fit**: cover, contain, fill, none

#### Video

Displays a video file (autoplay, muted, loop).

- **Source**: Browse button or paste video URL (mp4, webm)
- **Object fit**: cover, contain, fill, none
- **Loop**: toggle looping

#### Shape

A geometric shape.

- **Shape type**: rectangle, rounded, circle, triangle, star, hexagon, diamond, heart
- **Radius** (rounded/rect only): border radius
- **Gradient type**: solid, linear, radial
- **Gradient start/end**: color pickers
- **Gradient angle**: 0–360°
- **Stroke**: border color
- **Stroke width**: 0–20px
- **Dash**: dashed line pattern (e.g. `5,3`)

#### Text Label

A simple text element with full typography control.

- **Content**: custom text (textarea)
- **Align**: left, center, right
- **Bold** (Design tab): toggles font-weight between 400 and 700

---

## 4. Canvas & Editing

### 4.1 Positioning

Widgets are positioned using a 1920×1080 virtual canvas. X and Y are stored as percentages of the canvas dimensions. Width and height are stored in pixels.

- **Drag to move**: click and drag any widget on the canvas
- **Resize handles**: 8 handles (4 corners + 4 edges) appear on selection
- **Arrow keys**: nudge selected widget 1px per press (10px with Shift)
- **Auto-clamp**: widgets are clamped to canvas bounds on every position change

### 4.2 Snapping

- **Grid snap**: toggled via ⊞ button. Snaps to 10px increments
- **Keypoint snap**: during drag, edges and centers of other widgets act as snap targets within a 5px threshold. Visual guide lines appear

### 4.3 Zoom

- **Preset levels**: 0.25×, 0.5×, 1×, 1.5×
- **Auto-fit** (⊡): calculates the optimal zoom to fit the full 1920×1080 canvas within the viewport
- Auto-fit triggers on init, sidebar toggle, and window resize

### 4.4 Layers Panel

The Layers tab (left panel) shows all widgets in z-order (top = front). Features:
- **Drag to reorder**: changes the z-order of widgets
- **Click to select**: selects and highlights the widget
- **Lock icon**: indicates locked widgets (not selectable on canvas)
- **Visibility toggle**: show/hide widget (not yet available in current build)

### 4.5 Context Menu

Right-click any widget on the canvas to open the context menu:

| Action | Description |
|--------|-------------|
| Bring to Front | Moves widget to the top of the layer stack |
| Send to Back | Moves widget to the bottom |
| Bring Forward | Moves widget one layer up |
| Send Backward | Moves widget one layer down |
| Lock | Toggles lock (locked widgets can't be moved/resized) |
| Copy | Copies widget to clipboard |
| Duplicate | Creates a copy directly on the canvas |
| Delete | Removes the widget |

### 4.6 Undo/Redo

- **Undo**: Ctrl+Z
- **Redo**: Ctrl+Shift+Z or Ctrl+Y
- History depth: 40 states
- Captures: add, delete, move, resize, property changes, reorder

---

## 5. Properties Panel

When a widget is selected, the right panel shows three tabs:

### Design Tab

Common visual properties (see [3.1 Common Properties](#31-common-properties)).

### Settings Tab

Widget-specific options. See individual widget types in [3.2](#32-widget-types).

### Position Tab

| Property | Description | Control |
|----------|-------------|---------|
| X | Horizontal position (% of 1920) | range slider + number input |
| Y | Vertical position (% of 1080) | range slider + number input |
| Width | Widget width in pixels | range slider + number input |
| Height | Widget height in pixels | range slider + number input |
| Rotation | Z-axis rotation | range slider |
| Lock | Disable canvas interaction | checkbox |

---

## 6. Theme System

8 built-in themes that override accent, text, and background colors on all widgets:

| Theme | Accent | Text | Background |
|-------|--------|------|------------|
| Midnight | #5a7cff | #e8edf5 | rgba(10,14,30,.7) |
| Sunset | #ff6b6b | #ffe8e8 | rgba(40,10,20,.7) |
| Forest | #40c880 | #e0f5e8 | rgba(5,25,15,.7) |
| Neon | #ff44cc | #ffe0f0 | rgba(30,5,25,.7) |
| Gold | #ffb830 | #fff0d0 | rgba(30,20,5,.7) |
| Ocean | #30c0e0 | #d8f0ff | rgba(5,20,35,.7) |
| Mono | #c0c0c0 | #f0f0f0 | rgba(20,20,20,.7) |
| Retro | #ff8800 | #ffe0b0 | rgba(30,15,0,.7) |

Themes update: accent, text, background, text color, stroke, fill, gradient start, text shadow color, and box shadow color on all widgets.

---

## 7. Twitch Chat Integration

### 7.1 How It Works

The exported overlay connects **directly** to Twitch IRC via a secure WebSocket (`wss://irc-ws.chat.twitch.tv:443`). No middleware, companion app, or server is required.

### 7.2 Setup in Builder

1. Click **💬 Chat Tools** in the canvas bar
2. Enter your Twitch **channel name** (lowercase)
3. *(Optional)* Enter a **TMI token** from [twitchapps.com/tmi](https://twitchapps.com/tmi) — needed if you want the overlay to send messages back to chat (command responses, quote replies, etc.)
4. Export the overlay HTML

### 7.3 Authentication

- **Without token**: Anonymous read-only connection using a `justinfan` nickname. Chat messages are received and displayed. Command responses are shown on stream but NOT sent to Twitch chat.
- **With token**: Authenticated connection. The overlay can send `PRIVMSG` back to Twitch chat, allowing command responses and quote replies to appear in the chat panel.

### 7.4 Connection Lifecycle

- The overlay connects on page load (when the OBS Browser Source becomes active)
- Auto-reconnects every 5 seconds on disconnect
- Sends PONG to keep the connection alive
- Parses IRC tags for: `display-name`, `color`, `badges`, `mod` status

### 7.5 Builder Test Harness

The **Test chat…** field at the top of the builder sends test messages that:
- Appear in the Chat Box widget on the canvas
- Trigger command processing (custom commands and built-in commands)
- Simulate mod permissions (all test messages are treated as mod)

---

## 8. Commands System

### 8.1 Builder Setup

In the Chat Tools modal, **Commands** tab:

| Field | Description |
|-------|-------------|
| Command | The command name (without `!`) |
| Response | Text shown when the command is used |
| CD | Cooldown in seconds between uses |
| Mod | Checkbox — restrict command to mods/streamer only |

### 8.2 Custom Command Behavior

When a viewer types `!yourcommand` in Twitch chat:

1. The overlay receives the message via IRC
2. Checks if the command exists in its command list
3. Checks cooldown (if on cooldown, silently ignores)
4. If mod-only and user isn't a mod, sends: *"Only the streamer and moderators can use !yourcommand."*
5. Otherwise, displays the response in the Chat Box widget
6. If a TMI token is configured, also sends the response to Twitch chat

### 8.3 Built-in Commands

These commands are always available, regardless of user-defined commands:

| Command | Who | What |
|---------|-----|------|
| `!commands` | anyone | Lists all available commands (excludes mod-only ones for non-mods) |
| `!quote` | anyone | Shows a random quote |
| `!quote N` | anyone | Shows quote #N |
| `!quote count` | anyone | Shows total number of quotes |
| `!quote add <text>` | mod | Adds a new quote |
| `!quote del <id>` | mod | Removes a quote |
| `!command add <name> <resp>` | mod | Creates a new chat command |
| `!command del <name>` | mod | Removes a chat command |
| `!command edit <name> <resp>` | mod | Updates a command's response |
| `!command list` | anyone | Lists all custom commands |

### 8.4 Persistence

Commands are saved to `localStorage` under the key `blanket_cmds` in the OBS Browser Source. They survive page refreshes and scene switches (as long as "Refresh browser when scene becomes active" is unchecked in OBS).

Commands defined in the builder and embedded in the exported HTML serve as the **initial defaults**. Any changes made via `!command add/del/edit` are layered on top in localStorage. On page load, localStorage values take precedence over embedded defaults.

---

## 9. Quotes System

### 9.1 Builder Setup

In the Chat Tools modal, **Quotes** tab:
- Add quotes with text and author
- Edit quotes inline
- Delete quotes

### 9.2 Chat Management

| Command | Who | What |
|---------|-----|------|
| `!quote` | anyone | Shows a random quote (displays in chat box and chat) |
| `!quote N` | anyone | Shows quote #N |
| `!quote count` | anyone | Shows total number of saved quotes |
| `!quote add <text>` | mod | Creates a new quote (author = username) |
| `!quote del <id>` | mod | Removes a quote |

### 9.3 Persistence

Same as commands — saved to `localStorage` under `blanket_cmds`. Embedded builder quotes serve as defaults, with localStorage taking precedence.

---

## 10. Project & Config Management

### 10.1 Save/Load Project (Export Panel)

**⬇ Save Project**: Downloads `blanket-project.json` containing:
- All widgets with full properties
- Widget ID counter
- Commands array
- Quotes array
- Twitch channel and token
- Canvas background setting
- Zoom level
- Snap state

**⬆ Load Project**: Opens a file picker. Loading a project:
- Replaces all existing widgets
- Restores commands, quotes, and settings
- Clears undo/redo history
- Resets selection

### 10.2 Export/Import Config (Chat Tools Modal)

**⬇ Export Config**: Downloads `blanket-config.json` containing only:
- Commands
- Quotes
- Twitch channel
- TMI token

**⬆ Import Config**: Merges commands, quotes, and settings into the current builder state (does NOT affect widgets on the canvas).

---

## 11. Export

### 11.1 Export Panel

Open the export panel via the **Export** button in the top bar.

The exported HTML is fully self-contained:
- All widget CSS and layout inline
- All JavaScript (IRC client, command/quote handlers, localStorage)
- All commands, quotes, and Twitch settings embedded
- No external dependencies (no CDN links, no asset files)

### 11.2 Output

Three action buttons:

| Button | What |
|--------|------|
| **Copy to Clipboard** | Copies the generated HTML to your clipboard |
| **Download .html** | Saves the file as `blanket-overlay.html` |
| **⬇ Save Project** | Exports the full project as JSON |
| **⬆ Load Project** | Imports a project from JSON |

### 11.3 HTML Structure

The exported overlay is structured as:

```html
<!DOCTYPE html>
<html>
<head>
  <style>/* widget styles + animations */</style>
</head>
<body>
  <!-- Widget HTML -->
  <div style="position:fixed;...">content</div>
  ...
  <script>
    // IRC client, command/quote handlers, localStorage persistence
  </script>
</body>
</html>
```

---

## 12. OBS Setup

### 12.1 Adding to OBS

1. Export the overlay from the builder (Download .html)
2. In OBS, add a new **Browser Source** to your scene
3. Check **Local file** and select the downloaded `.html` file
4. Set **Width** to `1920` and **Height** to `1080`
5. Enable **Refresh browser when scene becomes active**
6. (Recommended) Uncheck **Shutdown source when not visible** if you want the IRC connection to stay alive

### 12.2 Multiple Overlays

You can create multiple scenes in the builder (by saving/loading different project files) and export each as a separate HTML file. Add each as a separate Browser Source in OBS with the appropriate dimensions.

### 12.3 For Alerts

The Alert Box widget displays alerts based on test messages sent through the builder's test harness. For live Twitch alerts (follows, subs, bits, raids), you need a service that forwards Twitch events to the overlay. Options:

- **StreamElements/StreamLabs Custom Widget**: Paste the exported HTML into their Custom Widget field. Their platform handles Twitch events and delivers them to the overlay via `postMessage`.
- **Self-hosted event bridge**: A small server that receives Twitch PubSub/EventSub events and forwards them to the overlay via `postMessage` or WebSocket.

### 12.4 Troubleshooting

| Problem | Solution |
|---------|----------|
| Chat not showing in OBS | Ensure channel name is entered in Chat Tools → Export → Re-add to OBS |
| Commands not working | Check that the overlay has IRC connection (chat messages should appear) |
| "Only moderators can use" on command | Command is marked as Mod-only in the builder. Uncheck Mod or use a mod account |
| Quotes not persisting | localStorage is keyed to the file path. If you move the HTML file, saved data is lost |
| Export HTML is very large | Expected — everything is inlined. ~50-500KB depending on widgets |
| OBS shows blank/white screen | Check that you set 1920×1080 resolution. Try enabling "Control audio via OBS" |
| Browser source flickers on scene switch | Enable "Refresh browser when scene becomes active" and "Shutdown source when not visible" |

---

## Appendix: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Delete / Backspace | Delete selected widget (not in input fields) |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Arrow keys | Nudge selected widget (1px) |
| Shift + Arrow keys | Nudge 10px |
| Escape | Exit preview mode |

## Appendix: CSS Custom Properties

The standalone element files in `elements/` use CSS custom properties for customization:

```css
--font: 'Inter', sans-serif;
--bg: rgba(10, 14, 30, 0.7);
--text: #e8edf5;
--accent: #5a7cff;
--glow: 0 0 20px rgba(90, 124, 255, 0.4);
```

Modify these in the exported HTML or the standalone elements to customize without the builder.
