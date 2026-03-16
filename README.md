# EyeCare Buddy

EyeCare Buddy is a deploy-ready, client-side web app that helps prevent eye strain and fatigue for long computer sessions.

## Features

- Real-time session timer with configurable limits and auto-stop option.
- Eye, physical, and breathing break reminders with modal/toast styles.
- Interactive exercise guidance for 20-20-20, blinking, eye rotation, stretching, and breathing.
- Health alerts when session usage approaches/exceeds limits.
- Analytics dashboard for daily/weekly usage and reminder compliance.
- Personalized tips based on behavior patterns.
- Theme toggle (light/dark), reminder sounds, and configurable settings.
- Responsive layout optimized for laptop/tablet and smaller screens.

## Run locally

Because this is a static app, you can run it with any local server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## File structure

- `index.html` – app layout and UI sections.
- `style.css` – responsive styling, themes, and exercise animations.
- `app.js` – session logic, reminders, analytics, storage, and rendering.
