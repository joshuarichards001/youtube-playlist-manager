# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — wrangler (port 5173) fronting Vite (port 5174). Wrangler serves the `functions/` directory so `/api/auth/*` works; all other requests proxy to Vite with full HMR. Reads env vars from `.dev.vars` at the repo root (must contain `GOOGLE_CLIENT_SECRET=...`). Open http://localhost:5173.
- `npm run dev:vite` — plain Vite on whatever port it picks; `/api/auth/*` will 404. Only useful if you're working on UI and don't need the auth flow.
- `npm run build` — `tsc -b` then `vite build`. Type errors fail the build.
- `npm run lint` — ESLint (flat config in `eslint.config.js`, `typescript-eslint` + React hooks plugins).
- `npm run preview` — preview the production build locally.

There is no test runner configured.

## Architecture

Single-page React 18 + TypeScript + Vite app that talks directly to the YouTube Data API v3 from the browser. A thin Cloudflare Pages Functions backend (`functions/api/auth/*`) exists only to hold the Google OAuth refresh token in an httpOnly cookie — the access token used for YouTube API calls lives in memory.

### Auth flow

- `main.tsx` wraps the app in `GoogleOAuthProvider` with a hard-coded `clientId`. The same client ID is duplicated in the Pages Functions; the `GOOGLE_CLIENT_SECRET` env var is set in the Cloudflare Pages dashboard (and `.dev.vars` for local).
- `src/hooks/useAuth.ts` uses the **auth-code flow** (scopes: `youtube.readonly` + `youtube.force-ssl`, `prompt: "consent"` on the interactive login to force Google to re-issue a refresh token). On mount it fires `POST /api/auth/refresh`; if that returns an access token the user is silently signed back in. Any time it gets an access token (from refresh or initial callback) it schedules the next silent refresh 5 minutes before expiry.
- `functions/api/auth/callback.ts` exchanges the auth code for tokens, stores the refresh token in an httpOnly `refreshToken` cookie scoped to `/api/auth`, and returns the access token + TTL to the browser.
- `functions/api/auth/refresh.ts` uses the cookie to mint a fresh access token from Google. If Google rejects the refresh token it clears the cookie in the response.
- `functions/api/auth/logout.ts` clears the cookie; `Nav.tsx` calls it on sign-out and reloads.
- `App.tsx` gates on `accessToken` + `authLoading` — while the initial refresh is in flight it renders null (prevents a landing-page flash on reload). Once settled it shows `LandingPage` or `HomePage` and calls `fetchUserAPI`.

### Downtime (NextDNS Recreation Time)

The site is only usable while NextDNS Parental Control would let YouTube through. `functions/api/downtime.ts` calls `GET api.nextdns.io/profiles/:id/parentalControl` (env vars `NEXTDNS_API_KEY`, `NEXTDNS_PROFILE_ID`; the key stays server-side) and returns the YouTube service's schedule: `{ blocked: false }` if the YouTube entry is missing or toggled off, otherwise `{ blocked: true, timezone, windows }` with per-weekday Recreation Time windows (empty if the clock toggle is off → blocked all day). `src/hooks/useDowntime.ts` refetches every 5 minutes and re-evaluates every minute; `App.tsx` renders null until the first response, then `DowntimeNotice` with a countdown. If the endpoint fails it keeps the last schedule, or falls back to 14:00–22:00 Europe/London (`FALLBACK_SCHEDULE` in `src/helpers/downtime.ts`) — including under `npm run dev:vite`, where `/api/*` 404s.

### Resume positions (cross-device)

`src/helpers/resumePosition.ts` keeps per-video positions in localStorage (`yt-resume`) and mirrors them to `functions/api/progress.ts`, which stores them in a D1 database bound as `DB` (table auto-created on first request). The function only accepts a Google access token whose `tokeninfo` email matches `ALLOWED_EMAIL` and was issued to our client ID. `VideoViewer.tsx` saves locally every 5s while playing and pushes to the cloud on pause/end, video switch, tab hide/close, and at most every 30s while playing. Before starting a video it fetches the cloud copy (1.5s timeout) and uses whichever of local/cloud has the newer `savedAt`. Finished videos are stored as position 0 rather than deleted so that "finished" also syncs. For list thumbnails, `src/hooks/useProgressSync.ts` (mounted in `App.tsx`) calls `syncResumePositions` on sign-in, on tab-visible, and every 5 min: it fetches `GET /api/progress?since=<cursor>` (cursor = server-clock `updated_at`, kept in localStorage `yt-resume-cursor`) and merges the rows into `yt-resume`. Any synced entry ≥ 90% or finished (position 0) is also marked watched via `markWatchedMany`, which is how the per-device `yt-watched` badge spreads between devices. Locally, `npm run dev` passes `--d1 DB` so wrangler uses a local SQLite D1.

### Watch history (cross-device)

`functions/api/history.ts` stores one row per watched video in the same D1 `DB` (`history` table, auto-created), with the video's metadata so listing costs no YouTube quota. GET is paginated by `watchedAt` cursor (`?before=`), PUT upserts (re-watching moves it back to the top, timestamped with the server clock), DELETE takes `{ videoIds }`. The owner check (`isOwner`) and `json` helper are shared with `progress.ts` via `functions/_lib/owner.ts` — it exports no `onRequest*`, so Pages doesn't route it. `VideoViewer.tsx` calls `recordHistory` (`src/helpers/history.ts`) the first time a video reaches the PLAYING state. `History.tsx` (sidebar → `/history`) lists it grouped by day, with "Load more", Move/Copy, and Delete (removes from history only).

### State (Zustand)

`src/helpers/store.ts` is the single store. Key fields:

- `accessToken`, `user` — auth/identity.
- `playlists`, `subscriptions` — sidebar data.
- `currentView` — discriminated union `{ type: 'playlist' | 'channel' | 'none' }` that drives what `Videos.tsx` renders. Setting `currentView` also clears `videos` and `nextPageToken` in the same update.
- `videos`, `nextPageToken`, `sort`, `viewingVideo`, `gridView`, `sidebarOpen`.

The Zustand middleware `devtools` is used; there is a `@ts-expect-error` above the `devtools(...)` call — leave it unless you're intentionally re-typing the store.

### Routing

There is no router. `src/helpers/routes.ts` maps `CurrentView` ↔ path (`/feed`, `/recommended`, `/subscriptions`, `/search`, `/history`, `/playlist/:id`, `/channel/:channelId`); the open video lives in `?v=`. `HomePage.tsx` owns all URL handling: one effect pushes a single history entry whenever `currentView`/`viewingVideo` change (no-op if the URL already matches), a `popstate` listener restores view + video on back/forward (incl. the PWA/iOS swipe-back), and on load it applies the URL's route (playlist routes wait until `playlists` load). Components just call `setCurrentView` / `setViewingVideo` — don't `pushState` from them. The main pane is keyed by route so each view remounts scrolled to the top. `public/_redirects` rewrites all routes to `/index.html` so client-side deep links resolve on Cloudflare Pages.

### YouTube API layer

`src/helpers/youtubeAPI/` wraps the YouTube Data API with axios. Each function takes `accessToken` as its first argument; callers pull it from the store. Errors are caught and logged — functions return empty arrays / `null` / `false` on failure rather than throwing, so callers generally don't need try/catch.

- `playlistAPI.ts` — list/create/delete playlists.
- `videoAPI.ts` — playlist items (`fetchVideosAPI`), channel uploads via search endpoint (`fetchChannelVideosAPI`), bulk detail hydration (`fetchVideoDetailsAPI`), plus comments, add, delete. Add/delete iterate serially — the API has no batch endpoint.
- `subscriptionAPI.ts` — paginates through all subscriptions in one call (loops until `nextPageToken` is absent); unsubscribe.
- `userAPI.ts` — current user profile.

Videos from the playlist-items endpoint only include snippet data, so `fetchVideosAPI` calls `fetchVideoDetailsAPI` to hydrate duration, view count, and publish date in a second request. `convertDurationToSeconds` in `helpers/functions.ts` parses ISO-8601 `PT#H#M#S` durations.

### Recent Feed (D1, WebSub push + browser sweep)

The "Recent Feed" view (`RecentFeed.tsx` → `StaticFeed` with `data` props) reads from the D1 `feed_videos` table via `GET /api/feed` (top 100 non-Shorts by `release_date` desc). SQL and fetching live in `functions/_lib/feed.ts`, WebSub in `functions/_lib/websub.ts`; routes are `functions/api/feed/{index,start,channel,finish,push}.ts`. Everything except `push` is owner-only (`isOwner`).

**Push (near real time).** Every subscribed channel's topic (`youtube.com/xml/feeds/videos.xml?channel_id=…`) is subscribed at `pubsubhubbub.appspot.com` with `/api/feed/push` as the callback; the `feed_subscriptions` table tracks each channel's lease. `push.ts` is public, so: its `GET` (intent verification) echoes `hub.challenge` only for a subscribe of a channel that has a row (and records `lease_expires_at`) or an unsubscribe of one that doesn't; its `POST` ignores anything whose `X-Hub-Signature` HMAC doesn't match or whose channel has no row, then upserts entries (Shorts probed as below) and deletes `at:deleted-entry` videos. It always answers 2xx so the hub doesn't retry. The HMAC secret is `WEBSUB_SECRET` if set, otherwise derived from `GOOGLE_CLIENT_SECRET`; with neither, push is off. Subscriptions are only made from the production origin — localhost and `*.<project>.pages.dev` preview hosts are skipped (`pushCallbackUrl`). `useFeedRefresh` re-reads `/api/feed` every 2 min while the tab is visible and on tab-visible, so pushed videos appear without a sweep.

**Sweep (backstop + lease renewal).** Driven by the browser, no cron. `useFeedRefresh` (mounted in `App.tsx`) loads the feed into the store (`feed`, `feedError`) on sign-in; once `subscriptions` have loaded, and on every tab-visible, it calls `refreshFeed()` (`src/helpers/feed.ts`):
1. `POST /api/feed/start` atomically claims the sweep in the single-row `feed_state` table — only if `refreshed_at` is > 6h old (or `force: true` from the "Refresh now" button) and no other client claimed it in the last 10 min. The rule lives server-side.
2. For every subscription, `POST /api/feed/channel { channelId, title }` (6 in flight). The function fetches the channel's RSS feed (falling back to `playlistItems` on the uploads playlist with the caller's access token), probes `youtube.com/shorts/<id>` only for video IDs not already in the table (cached in `is_short`), and (re)subscribes the channel to push if its lease has < 2 days left (at most one attempt per hour while unverified). One channel per request keeps each invocation under the Workers subrequest limit. Progress goes to the store's `feedRefresh` (`{ done, total, failed }`), shown as a progress bar in the feed header and as a thin `FeedRefreshBar` under the nav.
3. `POST /api/feed/finish { channelIds }` deletes videos and push subscriptions for channels no longer subscribed to (sending up to 40 hub unsubscribes per call), caps the table at 1000 rows, stamps `refreshed_at`, and returns the new feed. Skipped if more than half the channels failed, so the next page load retries.

Leases are renewed only by the sweep, so if the app isn't opened for longer than a lease (~5 days), pushes stop until the next visit's sweep re-subscribes and backfills.

### Recommended feed (offline pipeline)

`scripts/fetch-recommended.mjs` generates `public/recommended-feed.json` (max 50 videos, kept in YouTube's recommendation ranking order — the "Recommended" view hides the sort dropdown and does not sort). It uses `youtubei.js` (unofficial Innertube API) authenticated with a logged-in youtube.com `Cookie` header from the `YOUTUBE_COOKIE` GitHub Actions secret to harvest video IDs from the personalized Home feed, then hydrates titles/dates/view counts through the official Data API `videos.list` exchanging `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN` (GitHub Actions secrets) for an access token. Shorts (≤61s), live streams, Mixes, and playlists are filtered out. The script verifies the cookie actually authenticates (`yt.account.getInfo()`) and aborts without writing otherwise — an expired cookie leaves the previous JSON in place instead of replacing it with the generic logged-out feed. Cookies expire every few weeks-to-months; renew by re-copying the `Cookie` request header from devtools into the secret.

### Drag-and-drop

`Videos.tsx` makes each video row draggable and sets a JSON payload `{ videoId, sourcePlaylistId, videoItemId }` on `dataTransfer`. `Playlists.tsx` is the drop target and performs an optimistic update: remove the item from the local `videos` array, then fire `addVideosToPlaylistAPI` + `deleteVideosFromPlaylistAPI` in parallel (move) or just add (from channel view). Video-count badges are adjusted locally; on error the previous `videos` state is restored.

### Types

Global ambient types live in `global.d.ts` at the repo root — `Playlist`, `Video`, `Subscription`, `User`, `CurrentView`, `SortValues`, plus the raw `YouTube*` response shapes. No `import` needed; they are in the global namespace.

### Styling

Tailwind + daisyUI. Layout is mobile-first: sidebar hides behind a hamburger on `< md`, `VideoViewer` splits the main pane 50/50 on `md+` and replaces the list on mobile. Grid vs. list video layout is toggled via `gridView` in the store.
