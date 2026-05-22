# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Phim Hỏa Tốc** — a Vietnamese movie streaming site (Next.js 16 App Router, React 19, TypeScript, Tailwind v4). UI text, route segments (`/phim`, `/xem-phim`, `/danh-sach`, `/the-loai`, `/quoc-gia`, `/tim-kiem`, `/watchlist`, `/lich-su`, `/kham-pha`), and most code comments are in Vietnamese — preserve that when editing. [DESIGN.md](DESIGN.md) is the product/aesthetic spec (Netflix-inspired dark theme, "premium cinema" UX).

## Commands

```bash
npm run dev      # next dev (http://localhost:3000)
npm run build    # next build — run after any non-trivial change to catch type errors
npm run start    # serve the production build
npm run lint     # eslint (next/core-web-vitals + next/typescript)
```

There is no test suite.

## Data layer

All movie data comes from the external **KKPhim API** (`https://phimapi.com`); there is no local database. Every fetch lives in [src/services/api.ts](src/services/api.ts) and uses Next.js `fetch` with `next: { revalidate: N }` for caching (search uses `cache: 'no-store'`). Genre/country lists revalidate every 24h, listings/details every 10min. Add new endpoints there rather than inline-fetching from pages.

**Image URLs** must go through `getImageUrl(path)` — it wraps everything in `phimapi.com/image.php?url=...`, which serves WebP and acts as a CORS-safe proxy. Raw `phimimg.com` URLs will work but bypass the optimization. The allowed remote hosts are declared in [next.config.ts](next.config.ts).

### KKPhim API reference

Full docs: https://kkphim.vip/tai-lieu-api. Base: `https://phimapi.com`. Only the endpoints currently wrapped in [src/services/api.ts](src/services/api.ts) are listed first; the rest are available to add when needed.

| Purpose | Endpoint | Notes |
|---|---|---|
| Newly updated | `GET /danh-sach/phim-moi-cap-nhat?page=` | Also has `-v2` and `-v3` variants with different response shapes. |
| Movie detail + episodes | `GET /phim/{slug}` | Returns `{ movie, episodes }`. |
| Detail by TMDB ID | `GET /tmdb/{tv\|movie}/{id}` | Only works for KKPhim entries mapped to TMDB. |
| List by type | `GET /v1/api/danh-sach/{type_list}` | `type_list` ∈ `phim-bo`, `phim-le`, `tv-shows`, `hoat-hinh`, `phim-vietsub`, `phim-thuyet-minh`, `phim-long-tieng`. |
| Search | `GET /v1/api/tim-kiem?keyword=` | Same filter params as list. |
| Categories | `GET /the-loai` | Returns slug list. |
| List by category | `GET /v1/api/the-loai/{slug}` | No `category` param — slug is the category. |
| Countries | `GET /quoc-gia` | |
| List by country | `GET /v1/api/quoc-gia/{slug}` | No `country` param — slug is the country. |
| List by year | `GET /v1/api/nam/{year}` | `year` 1970–present. |
| Image → WebP | `GET /image.php?url=` | Used by `getImageUrl`. |

**Shared query params** (apply to all `/v1/api/...` list endpoints):

- `page` — integer; use `pagination.totalPages` from response to bound.
- `limit` — max **64**.
- `sort_field` — `modified.time` | `_id` | `year`.
- `sort_type` — `asc` | `desc`.
- `sort_lang` — `vietsub` | `thuyet-minh` | `long-tieng`.
- `category` — slug from `/the-loai` (omitted on `/v1/api/the-loai/...`).
- `country` — slug from `/quoc-gia` (omitted on `/v1/api/quoc-gia/...`).
- `year` — 1970–present (omitted on `/v1/api/nam/...`).

When adding a new endpoint, wrap it in `api.ts`, choose `revalidate` consistent with neighbors (listings 600s, lookups 600s, taxonomy 86400s, search `no-store`), and return the normalized `{ status, items, pagination }` shape — the V1 envelope nests under `data.items` / `data.params.pagination` and existing helpers already unwrap it.

## Architecture

**Server Components fetch, Client Components interact.** Page files (`src/app/**/page.tsx`) are async Server Components that call the API helpers and pass data into `'use client'` components (`MovieDetailClient`, `WatchPlayerClient`, `FilterBarClient`, `Header`, etc.). Don't add client-side fetching for data that a server component could load — it breaks the caching model and SEO.

**Global client state** lives in a single context: [src/context/AppContext.tsx](src/context/AppContext.tsx) (`useApp()`). It owns watchlist, watch history, cinema mode, and PWA install state. Persistence is LocalStorage under keys `phimhoatoc_watchlist` and `phimhoatoc_history`. Two performance patterns are load-bearing here — don't unwind them without thinking:

- **`historyRef` shadows `history` state.** `saveWatchProgress` (called every second from the video player) writes to the ref and only flushes to `setState` every 30s; `getWatchProgress` reads from the ref. This is intentional — promoting these to state caused the player to re-render the whole tree on every `timeupdate`. The ref is also flushed to LocalStorage on `beforeunload` / `visibilitychange` so progress survives tab close.
- **Debounced LocalStorage writes.** Watchlist writes are debounced 500ms, history writes 2s.

**Video playback** ([src/components/WatchPlayerClient.tsx](src/components/WatchPlayerClient.tsx), ~1200 lines) supports two modes:
- `hls` — native `<video>` + `hls.js` for `.m3u8` streams, with a fully custom controls overlay (play/pause, seek, volume, PiP, fullscreen, episode drawer, lock).
- `embed` — sandboxed `<iframe>` fallback for sources that only provide an embed link.

Episodes can switch in-place during fullscreen via `overrideEpisode` state (avoids losing fullscreen on route change). The DOM-write hot path in the player uses refs + manual style mutations (`lastBgPctRef`, `lastTimeTextRef`) to skip redundant writes per `timeupdate` — keep that style if you touch progress-bar code.

**PWA.** [public/sw.js](public/sw.js) is a minimal network-first service worker (no asset caching by design — earlier image caching was removed). Registration and `beforeinstallprompt` handling live in `AppContext`. The manual-install modal there has platform-specific instructions for iOS Safari vs Android/desktop Chrome.

## Styling

Tailwind v4 with the `@theme` directive in [src/app/globals.css](src/app/globals.css) — there is **no** `tailwind.config.js`. The slate palette is overridden to a zinc/black ramp (no navy tint), and brand colors are `brand-violet` / `brand-rose` (Netflix red `#E50914` / `#C11119`) and `brand-cyan` (off-white). Custom utilities to know: `glass-panel`, `bg-gradient-brand`, `shadow-neon`, `animate-slide-up`. Globals also nuke `:focus` outlines on layout containers — don't add them back without a reason.

Path alias: `@/*` → `src/*`.

## Pitfalls

- **Vietnamese route slugs.** Don't anglicize `phim`/`xem-phim`/`tap-1` etc. — they're part of the public URL and SEO.
- **`movie.type` → API type mapping.** When fetching related movies, the KKPhim list-API type differs from `MovieDetail.type` (`series` → `phim-bo`, `single` → `phim-le`, `hoathinh` → `hoat-hinh`, `tvshows` → `tv-shows`). The mapping is repeated in detail and watch pages; reuse the existing code rather than inventing a new mapping.
- **Windows shell.** This repo's primary working dir is `c:\react_spring\phimhoatoc`. The harness runs bash, so use forward slashes and Unix syntax (`/dev/null`, not `NUL`).
