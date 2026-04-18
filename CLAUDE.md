# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server (note: README says `npm run start`, but the real script is `dev`).
- `npm run build` — `tsc -b` then `vite build`. Type errors fail the build.
- `npm run lint` — ESLint (flat config in `eslint.config.js`, `typescript-eslint` + React hooks plugins).
- `npm run preview` — preview the production build locally.

There is no test runner configured.

## Architecture

Single-page React 18 + TypeScript + Vite app that talks directly to the YouTube Data API v3 from the browser. No backend — the Google OAuth access token is the only credential and is kept in a cookie.

### Auth flow

- `main.tsx` wraps the app in `GoogleOAuthProvider` with a hard-coded `clientId`.
- `LoginButton.tsx` uses `useGoogleLogin` (implicit flow) to obtain an access token with scopes `youtube.readonly` and `youtube.force-ssl`, stores it in an `accessToken` cookie (via `js-cookie`) with expiry matching `expires_in`, and writes it to the Zustand store.
- `App.tsx` gates on `accessToken`: unauthenticated → `LandingPage`, authenticated → `HomePage` (Nav + Sidebar + Videos). `App.tsx` also calls `fetchUserAPI` once the token is present.
- Sign-out just removes the cookie and reloads.

### State (Zustand)

`src/helpers/store.ts` is the single store. Key fields:

- `accessToken`, `user` — auth/identity.
- `playlists`, `subscriptions` — sidebar data.
- `currentView` — discriminated union `{ type: 'playlist' | 'channel' | 'none' }` that drives what `Videos.tsx` renders. Setting `currentView` also clears `videos` and `nextPageToken` in the same update.
- `videos`, `nextPageToken`, `sort`, `viewingVideo`, `gridView`, `sidebarOpen`.

The Zustand middleware `devtools` is used; there is a `@ts-expect-error` above the `devtools(...)` call — leave it unless you're intentionally re-typing the store.

### Routing

There is no router. URLs are synthesized manually with `window.history.pushState` from the click handlers (`/playlist/:id`, `/channel/:channelId`). On load, `Playlists.tsx` parses `window.location.pathname` after fetching playlists and restores `currentView` if the path matches. `vercel.json` rewrites all routes to `/` so client-side deep links resolve.

### YouTube API layer

`src/helpers/youtubeAPI/` wraps the YouTube Data API with axios. Each function takes `accessToken` as its first argument; callers pull it from the store. Errors are caught and logged — functions return empty arrays / `null` / `false` on failure rather than throwing, so callers generally don't need try/catch.

- `playlistAPI.ts` — list/create/delete playlists.
- `videoAPI.ts` — playlist items (`fetchVideosAPI`), channel uploads via search endpoint (`fetchChannelVideosAPI`), bulk detail hydration (`fetchVideoDetailsAPI`), plus comments, add, delete. Add/delete iterate serially — the API has no batch endpoint.
- `subscriptionAPI.ts` — paginates through all subscriptions in one call (loops until `nextPageToken` is absent); unsubscribe.
- `userAPI.ts` — current user profile.

Videos from the playlist-items endpoint only include snippet data, so `fetchVideosAPI` calls `fetchVideoDetailsAPI` to hydrate duration, view count, and publish date in a second request. `convertDurationToSeconds` in `helpers/functions.ts` parses ISO-8601 `PT#H#M#S` durations.

### Drag-and-drop

`Videos.tsx` makes each video row draggable and sets a JSON payload `{ videoId, sourcePlaylistId, videoItemId }` on `dataTransfer`. `Playlists.tsx` is the drop target and performs an optimistic update: remove the item from the local `videos` array, then fire `addVideosToPlaylistAPI` + `deleteVideosFromPlaylistAPI` in parallel (move) or just add (from channel view). Video-count badges are adjusted locally; on error the previous `videos` state is restored.

### Types

Global ambient types live in `global.d.ts` at the repo root — `Playlist`, `Video`, `Subscription`, `User`, `CurrentView`, `SortValues`, plus the raw `YouTube*` response shapes. No `import` needed; they are in the global namespace.

### Styling

Tailwind + daisyUI. Layout is mobile-first: sidebar hides behind a hamburger on `< md`, `VideoViewer` splits the main pane 50/50 on `md+` and replaces the list on mobile. Grid vs. list video layout is toggled via `gridView` in the store.
