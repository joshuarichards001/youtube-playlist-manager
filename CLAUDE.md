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

### State (Zustand)

`src/helpers/store.ts` is the single store. Key fields:

- `accessToken`, `user` — auth/identity.
- `playlists`, `subscriptions` — sidebar data.
- `currentView` — discriminated union `{ type: 'playlist' | 'channel' | 'none' }` that drives what `Videos.tsx` renders. Setting `currentView` also clears `videos` and `nextPageToken` in the same update.
- `videos`, `nextPageToken`, `sort`, `viewingVideo`, `gridView`, `sidebarOpen`.

The Zustand middleware `devtools` is used; there is a `@ts-expect-error` above the `devtools(...)` call — leave it unless you're intentionally re-typing the store.

### Routing

There is no router. URLs are synthesized manually with `window.history.pushState` from the click handlers (`/playlist/:id`, `/channel/:channelId`). On load, `Playlists.tsx` parses `window.location.pathname` after fetching playlists and restores `currentView` if the path matches. `public/_redirects` rewrites all routes to `/index.html` so client-side deep links resolve on Cloudflare Pages.

### YouTube API layer

`src/helpers/youtubeAPI/` wraps the YouTube Data API with axios. Each function takes `accessToken` as its first argument; callers pull it from the store. Errors are caught and logged — functions return empty arrays / `null` / `false` on failure rather than throwing, so callers generally don't need try/catch.

- `playlistAPI.ts` — list/create/delete playlists.
- `videoAPI.ts` — playlist items (`fetchVideosAPI`), channel uploads via search endpoint (`fetchChannelVideosAPI`), bulk detail hydration (`fetchVideoDetailsAPI`), plus comments, add, delete. Add/delete iterate serially — the API has no batch endpoint.
- `subscriptionAPI.ts` — paginates through all subscriptions in one call (loops until `nextPageToken` is absent); unsubscribe.
- `userAPI.ts` — current user profile.

Videos from the playlist-items endpoint only include snippet data, so `fetchVideosAPI` calls `fetchVideoDetailsAPI` to hydrate duration, view count, and publish date in a second request. `convertDurationToSeconds` in `helpers/functions.ts` parses ISO-8601 `PT#H#M#S` durations.

### Subscription feed (offline pipeline)

`SubscriptionFeed.tsx` does NOT call the YouTube Data API. Instead it `fetch`es `/subscription-feed.json`, a static file generated out-of-band by `scripts/fetch-feed.mjs` (Node, uses `fast-xml-parser`).

The script reads channel IDs from `data/channels.json`, hits each channel's public RSS feed (`youtube.com/feeds/videos.xml?channel_id=…`) with 8-way concurrency, dedupes, sorts by `releaseDate` desc, then filters out Shorts by probing `youtube.com/shorts/<id>` with `redirect: "manual"` (status 200 = Short, 3xx = regular video). It keeps the top 200 and writes `public/subscription-feed.json`. The recent "refresh subscription feed" commits are regenerations of this file.

Consequence: the feed is read-only and only as fresh as the last script run; drag-out of a feed video into a playlist works (via the same `dataTransfer` contract as `Videos.tsx`) but no upload/move-from-feed equivalent exists on the server side.

### Drag-and-drop

`Videos.tsx` makes each video row draggable and sets a JSON payload `{ videoId, sourcePlaylistId, videoItemId }` on `dataTransfer`. `Playlists.tsx` is the drop target and performs an optimistic update: remove the item from the local `videos` array, then fire `addVideosToPlaylistAPI` + `deleteVideosFromPlaylistAPI` in parallel (move) or just add (from channel view). Video-count badges are adjusted locally; on error the previous `videos` state is restored.

### Types

Global ambient types live in `global.d.ts` at the repo root — `Playlist`, `Video`, `Subscription`, `User`, `CurrentView`, `SortValues`, plus the raw `YouTube*` response shapes. No `import` needed; they are in the global namespace.

### Styling

Tailwind + daisyUI. Layout is mobile-first: sidebar hides behind a hamburger on `< md`, `VideoViewer` splits the main pane 50/50 on `md+` and replaces the list on mobile. Grid vs. list video layout is toggled via `gridView` in the store.
