# EyeCare Buddy

EyeCare Buddy is a fully functional, deploy-ready web app that helps users prevent eye strain, fatigue, and physical discomfort during long laptop/desktop sessions.

## Key Features

- **Real-time session tracking** with configurable session limits and countdown indicators.
- **Custom reminders** for eye care, posture/stretching, and breathing exercises.
- **Browser Notification API support** (with optional visual toast/modal + sound alerts).
- **Interactive eye-exercise guidance** for the 20-20-20 rule, blink reset, and eye rotations.
- **Physical wellness guidance** including stretch posture prompts and quick mini-workout nudges.
- **Health safeguards** with near-limit warnings, optional auto-stop, and optional lock overlay at limit.
- **Full-screen takeover alerts** that darken the whole browser view with a large break prompt and countdown.
- **Optional kiosk full-screen mode** to keep EyeCare Buddy on top for stronger reminders while you work.
- **Analytics dashboard** for daily/weekly usage charts plus break/exercise compliance metrics.
- **Personalized tips** based on reminder completion and average usage patterns.
- **Accessibility & UX improvements**: keyboard-focus states, skip link, live-region announcements, high-contrast mode, and responsive design.
- **Local persistence** of all settings and stats through `localStorage`.

## Run Locally

```bash
python -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Project Structure

- `index.html` – semantic UI structure, forms, reminder modals, lock overlay.
- `style.css` – themes, high contrast mode, responsive layout, animations, focus styles.
- `app.js` – session engine, reminders, Notification API integration, analytics, persistence.

> Note: Browsers do not allow websites to force-black the entire operating system screen while the site is unfocused. For the closest behavior, enable **Kiosk full-screen session mode** and browser notifications.
