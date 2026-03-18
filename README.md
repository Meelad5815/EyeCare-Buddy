# EyeCare Buddy (Electron Desktop App)

EyeCare Buddy is an advanced desktop app built with Electron to prevent eye strain and enforce mandatory breaks.

## What it does

- Runs as a desktop process and can keep monitoring in the background (via tray + timer engine in Electron main process).
- Triggers mandatory breaks after configurable session time.
- Opens a fullscreen, always-on-top black break window with message: **"Stop! Take a Break"**.
- Uses kiosk mode for lock-style behavior during enforced breaks.
- Shows guided break flow with rotating exercise instructions:
  - 20-20-20 rule
  - Blinking exercise
  - Neck/shoulder stretches
  - Breathing routine
- Displays break countdown timer.
- Sends warning notification before lock and break notification at lock time.
- Supports customization:
  - Session duration
  - Break duration
  - Warning lead time
  - Strictness (soft/standard/strict)
  - Forced lock mode on/off
- Tracks analytics:
  - Screen minutes today
  - Breaks taken
  - Breaks skipped
  - Basic daily chart

## Project files

- `main.js` – Electron main process, timer engine, tray, lock window control, notifications, persistence.
- `preload.js` – secure IPC bridge.
- `index.html` + `renderer.js` – dashboard UI/settings/analytics.
- `break.html` + `break.js` – fullscreen enforced break experience.
- `style.css` – styles for dashboard and break lock overlay.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start app:

```bash
npm start
```

3. Run syntax checks:

```bash
npm run check
```

## Note on enforcement

EyeCare Buddy uses Electron fullscreen + always-on-top + kiosk window behavior for lock-style enforcement on desktop. OS-level security policies may still allow privileged system shortcuts depending on platform.
