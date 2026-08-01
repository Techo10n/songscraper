# SongScraper

Find the song in any Instagram reel. Paste or share a reel link, and SongScraper identifies the songs that appear in it — whether tagged in Instagram audio, shown as on-screen text, or just audible in the clip.

Extracted from [MusicBridge](https://github.com/Techo10n/musicbridge)'s Instagram Reel Import feature into its own standalone app.

---

## Tech Stack

| | |
|---|---|
| Framework | Expo SDK 55, React Native 0.83.2, React 19.2.0 |
| Routing | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Language | TypeScript |
| Node.js | 22.13.0 |

> `npm install --legacy-peer-deps` required (react-dom peer dep conflict with Expo SDK 55 / React 19).

---

## Running Locally

```bash
nvm use                      # or install/use Node 22.13.0
cp .env.example .env.local   # fill in Supabase URL/anon key
npx expo start                # Metro bundler (Expo Go works for JS-only testing)
npx expo run:ios              # iOS native build (needed for the Share Extension)
npm run typecheck
npm test
npm run verify                # typecheck + tests
supabase db push               # apply new Supabase migrations to linked project
eas env:push production --path .env.local --force  # sync EXPO_PUBLIC_* vars before TestFlight builds
```

---

## Repository Structure

```
songscraper/
├── app/
│   ├── _layout.tsx             Root layout: AuthProvider + auth redirect + clipboard banner/modal
│   ├── index.tsx                Paste-a-reel-URL screen
│   ├── history.tsx              Saved reel-import history
│   └── (auth)/
│       ├── login.tsx
│       └── register.tsx
├── components/
│   ├── ReelImportBanner.tsx     Slim banner shown when a reel URL is in the clipboard
│   └── ReelImportModal.tsx      Full reel-import flow: analyze → song list → save/open
├── hooks/
│   ├── useAuth.tsx              AuthContext + hook (email/password only)
│   └── useClipboardReel.ts      Clipboard polling + deep-link reel extraction
├── lib/
│   ├── supabase.ts
│   ├── reelParser.ts             parseReelUrl, isReelUrl, platform/shortcode types
│   ├── reelLists.ts              Saved reel-list persistence (remote + local fallback)
│   ├── theme.ts
│   └── utils.ts                  cleanArtistName(), cleanTitle(), withTimeout()
├── ios/
│   └── ShareExtension/           iOS share sheet extension → songscraper://import-reel
├── types/index.ts
├── __tests__/
├── test/jest.setup.ts
└── supabase/
    ├── functions/parse-reel/index.ts   Edge Function: Instagram reel → songs
    └── migrations/
        ├── 001_initial.sql               users table + RLS
        ├── 002_profile_trigger.sql       auth.users → public.users trigger
        ├── 003_reel_import_history.sql   reel_imports / reel_import_songs + RLS
        └── 004_reel_import_songs_rpc.sql upsert_reel_import_songs RPC
```

---

## Architecture

No custom backend server beyond Supabase. Supabase handles auth, the database, and RLS. The `parse-reel` Edge Function does the actual identification work server-side (so API keys for AudD/Anthropic never ship client-side).

- **Auth**: Email + password via `supabase.auth.signInWithPassword`. Sessions persisted in AsyncStorage. An `on_auth_user_created` trigger creates the `public.users` profile row on signup.
- **No streaming-service OAuth** — tapping a song opens a [song.link](https://song.link) universal page instead of deep-linking into a chosen service. (Full OAuth deep-linking may be added later.)
- **No social features** — no friends, following, or sharing between users in v1.

---

## Instagram Reel Import

**Flow**:
1. `useClipboardReel` polls the clipboard on foreground and after auth hydration. The iOS Share Extension forwards shared reel URLs into `songscraper://import-reel?text=<payload>`.
2. `ReelImportBanner` appears with a "Find Song" button when a reel URL is detected.
3. Tapping "Find Song," or submitting the paste-URL screen, opens `ReelImportModal`, which calls the `parse-reel` Edge Function.
4. On success: shows an ordered song list. Tapping a song opens its song.link page. The list can be saved to History.
5. On failure: shows a brief error state and auto-closes.

**Reel analysis pipeline** (all server-side, in `supabase/functions/parse-reel/index.ts`):

| Stage | Method | Notes |
|---|---|---|
| 1 | Instagram metadata scrape | Hits Instagram GraphQL with a mobile-style header set. Parses `clips_music_attribution_info`, caption text, preview comments, plus `video_url`/`video_duration` for follow-up analysis. |
| 2 | AudD audio fingerprinting | Uploads the reel file to AudD's enterprise scan endpoint, aggregates repeated chunk hits, canonicalizes titles/artists through iTunes. Requires `AUDD_API_TOKEN` Supabase secret. |
| 3 | Client frame OCR | `ReelImportModal` extracts staged frames via `expo-video-thumbnails`, sends them to the edge function, and Claude Haiku returns songs only when both title and artist are directly readable on-screen. |
| 4 | Client confidence merge | Ranks raw audio/metadata/text/vision hits together, favoring corroboration across sources and earliest observed reel position. |
| 5 | Staged vision fallback | Runs additional OCR passes (late → middle → early, or a single dense sweep for short reels) only when the initial result is thin. |

If all stages miss, the modal shows "Couldn't identify the song" and closes.

**Instagram only in v1** — TikTok URL patterns already exist in `lib/reelParser.ts` but the Edge Function doesn't scrape/fingerprint TikTok yet.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

Edge Function secrets (set via `supabase secrets set`, never committed):

| Secret | Purpose |
|---|---|
| `AUDD_API_TOKEN` | Audio fingerprinting — sign up at [audd.io](https://audd.io) |
| `ANTHROPIC_API_KEY` | Frame OCR (Claude Haiku) — from [console.anthropic.com](https://console.anthropic.com) |

---

## Current Limitations

1. **Track matching is approximate** — uses `cleanTitle()` + `cleanArtistName()` heuristics, resolved via song.link. No ISRC matching.
2. **Instagram-only** — TikTok URL detection exists but isn't wired to the identification pipeline yet.
3. **No streaming-service deep-linking** — song.link only, for now.
4. **iOS Share Extension requires a native build** — Expo Go can run the JS app for testing the paste-URL flow, but the share-sheet integration needs `expo prebuild` + a custom dev client or full build.
