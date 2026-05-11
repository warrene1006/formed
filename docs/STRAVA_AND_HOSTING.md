# Formed Hosting, Strava, Calendar, And Coach MVP

## Hosting Path

Use Vercel for the web app and API routes, and Supabase for the private database.

- Vercel hosts `index.html`, `styles.css`, `app.js`, and the `/api/*` server functions.
- Supabase stores Strava tokens, synced activities, and calendar settings.
- Strava sends OAuth back to `/api/strava/callback`.
- Strava webhook events go to `/api/strava/webhook`.
- Apple Calendar subscribes to `/api/calendar.ics?token=YOUR_CALENDAR_TOKEN`.
- Coach dialogue and session feedback use `/api/coach/dialogue` and `/api/coach/feedback`.

This keeps secrets out of the browser. The browser never sees the Strava client secret or Supabase service role key.

## Strava App Setup

1. Go to `https://www.strava.com/settings/api`.
2. Create an API application named `Formed`.
3. Set the website to your deployed Vercel URL once you have it.
4. Set the authorization callback domain to the hostname only, for example `your-formed-by-elias-domain.vercel.app`.
5. For local testing, Strava allows `localhost` and `127.0.0.1`.
6. Copy the Client ID and Client Secret into Vercel environment variables:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`

The app requests `read,activity:read,activity:read_all` so activity webhooks work and private activities can be used in planning if you authorize that scope.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Copy the project URL into `SUPABASE_URL`.
5. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.

Only put the service role key in server-side environment variables. Never paste it into browser code.

## Vercel Environment Variables

Use `.env.example` as the checklist. Required for the MVP:

- `PUBLIC_APP_URL`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_SECRET`
- `CALENDAR_TOKEN`
- `STRAVA_WEBHOOK_VERIFY_TOKEN`
- `OPENAI_API_KEY` if you want AI coach responses instead of deterministic fallback logic.
- `OPENAI_MODEL`, default `gpt-5.2`.

Calendar defaults are already set for Elias:

- Weekday start: `05:30`
- Weekday done by: `07:00`
- Weekend start: `05:45`
- Weekend done by: `07:30`
- Calendar name: `Elias`
- Default coach name: `Elias`

## First Run

1. Deploy to Vercel.
2. Open the deployed app.
3. Click `Connect Strava`.
4. Authorize the app in Strava.
5. Run `https://YOUR_DOMAIN/api/strava/sync?token=YOUR_CALENDAR_TOKEN`.
6. Create the Strava webhook subscription:

```text
https://YOUR_DOMAIN/api/strava/webhook-subscribe?token=YOUR_CALENDAR_TOKEN
```

7. Subscribe Apple Calendar to:

```text
webcal://YOUR_DOMAIN/api/calendar.ics?token=YOUR_CALENDAR_TOKEN
```

If Apple Calendar does not accept the `webcal://` version, use the same URL with `https://`.

## MVP Behavior

- Completed activities sync from Strava into Supabase.
- Strava webhook events are stored in Supabase so completed-workout changes can trigger follow-up sync work.
- The calendar feed regenerates from stored activities and the current date.
- The coach dialogue can gather plan-start context.
- Session feedback can adapt the next generated workout, especially for high RPE, rough sessions, pain flags, and strong days.
- The app still supports manual Garmin/Strava CSV import.
- Apple Health metrics are not automatic yet; that requires a native iOS HealthKit wrapper or a separate import/export path.

## Coach Naming

`Formed` is the app. Each user can name their coach. Eric's default is `Elias`.

In the local browser app, coach name and coach messages are saved in `localStorage`. In the deployed MVP, Supabase can store coach messages and session feedback.
