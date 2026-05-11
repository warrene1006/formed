# Formed

Local browser prototype for an event-aware endurance plan that adapts to readiness, health signals, travel, bike availability, and weekly life constraints.

Seeded assumptions:

- Current planning date: May 11, 2026.
- K-Town on the River 70.3: August 1, 2026.
- Road Bourbon Chase Ragnar: October 2-3, 2026.
- Bike tune-up and Disney travel keep the first block run-focused until after Sunday, May 24.
- Strength work uses Amped Fitness sessions.
- The generated week can export to CSV or iCalendar `.ics` for Apple Calendar.
- The MVP server scaffold supports Strava OAuth, Strava activity sync, Supabase persistence, and a private live calendar feed.
- Users can name their coach. Eric's coach defaults to `Elias`.
- The app has a plan-start dialogue and post-session feedback loop. Without an AI key it uses local fallback logic; with `OPENAI_API_KEY`, the server coach endpoints use the OpenAI Responses API.

Open `index.html` directly or run:

```sh
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## MVP automation setup

See [docs/STRAVA_AND_HOSTING.md](/Users/eric.warren/Documents/New%20project/docs/STRAVA_AND_HOSTING.md) for the Strava API, Vercel, Supabase, and Apple Calendar feed setup.

Secrets live in `.env.local` locally and Vercel environment variables in production. Do not commit API keys.

## Computer and phone access

For both computer and phone, host this as a small web app and install it from the browser:

- Quick local testing: run `python3 -m http.server 4173`, then open the Mac's local network URL from your phone while both devices are on the same Wi-Fi.
- Better daily use: deploy the folder to Netlify, Vercel, GitHub Pages, Cloudflare Pages, or a small personal server.
- Once hosted over HTTPS, the app can be added to the iPhone home screen as a PWA.

The app currently updates when you change readiness inputs, availability, dates, or import a fresh CSV. Automatic completed-workout updates require data sync:

- Strava OAuth for activity completion and pace/HR data.
- HealthKit in an iOS wrapper for Apple Health, sleep, HRV, resting HR, and body metrics.
- Garmin data through Garmin Health API access, or indirectly through Garmin-to-Strava sync.
- A backend account/database so phone and computer see the same plan and completion history.
- A subscribed `webcal://` calendar feed if Apple Calendar should update automatically after the plan changes. A downloaded `.ics` file is a snapshot.
