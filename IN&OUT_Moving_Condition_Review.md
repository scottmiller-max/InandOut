# IN&OUT Moving — Condition Review
*Reviewed 2026-07-12. Scope: `Inoutmoving` GitHub repo (Expo/React Native app) + live Supabase project `gdiudffqjhidreqzklbl` + Squarespace marketing site source files found in the repo.*

## Bottom line

This is a real, substantial app — not a prototype. Expo Router, TypeScript, a proper service-role/RLS split on the backend, 27 actively deployed edge functions, and low mock-data debt. But there is one launch-blocking configuration problem: the app's local environment file points at a Supabase project that does not exist in your account. If that's what ships in the build, the app will install fine and then fail to do anything — no login, no quotes, no tracking — because it can't reach a real backend. That's the first thing to fix, before anything else on this list matters.

## What's genuinely good

The engineering here is above what "vibe-coded" apps usually look like. Every edge function I checked imports a shared `_shared/auth.ts` module (`identifyActor`, `requireRole`, `requireStaffOrSecret`) instead of copy-pasted auth logic, which is exactly the kind of thing that prevents one forgotten function from becoming a security hole. The Vapi webhook verifies a shared secret before writing call data. No real secrets are committed to git — `.env` is correctly gitignored, and the only client-exposed values are the Supabase anon key and URL, which are meant to be public. Only 3 TODO/FIXME markers turned up across the whole app/components/services tree — this app is largely built, not stubbed.

## P0 — must fix before launch

**1. The app's Supabase config points to a project that doesn't exist.**
`.env` sets `EXPO_PUBLIC_SUPABASE_URL=https://fafminmkfrobeldpghdr.supabase.co`. Your Supabase account has exactly one project: `gdiudffqjhidreqzklbl` ("I&Omovin app"). `fafminmkfrobeldpghdr` isn't in your account — it doesn't appear anywhere else in the repo either. If this `.env` (or whatever environment values get baked into the actual EAS/app-store build) still references that ref, every backend call in the shipped app fails silently or with a network error. **Fix:** update `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the real project's values, and check whatever EAS build profile / CI secret store feeds production builds — it may have the same stale value baked in separately from this local `.env`.

**2. No crash boundary wraps the app.**
`components/ErrorBoundary.tsx` is a fully built React error boundary, but it isn't imported anywhere — `app/_layout.tsx` renders the navigation `<Stack>` directly with nothing catching render errors. Right now, any unhandled error on any screen takes the customer to a blank white screen with no way back in, and you get no signal that it happened. **Fix:** wrap `<Stack>` in `<ErrorBoundary>` in `app/_layout.tsx` — this is a small, safe, high-value change.

**3. RLS on `admin_users`, `daily_counters`, `rate_limits_config`.** ✅ Fixed this session — see the RLS section below.

## P1 — correctness & integration

**4. ~~The website's quote form doesn't feed the app's CRM~~ — correction: it does.**
The local repo's `squarespace-landing-page.html` and `squarespace-sections.md` files show an older Tally.so embed, but checking the **live, published site** directly (inandoutmovin.com) on 2026-07-12 found the actual quote form now posts straight to `https://gdiudffqjhidreqzklbl.supabase.co/functions/v1/contact-submit` — the correct project, the correct function. Someone (likely you, editing directly in Squarespace) already fixed this gap; the repo's local HTML files are just stale copies and don't reflect what's live. Good news, no action needed here — worth pushing a copy of the current live code back into the GitHub repo at some point so the two don't keep diverging (see #6 below).

**5. None of the 27 live edge functions are checked into the GitHub repo.**
`supabase/functions/` in the repo is empty. This includes the 9 that were "orphaned" (deployed live but missing from source) — the 6 synced into Bolt.new earlier plus the 3 just finished today are in Bolt's project, but not in this GitHub repo tied to your app's version control. If the Supabase project were ever lost or you needed to redeploy from source, there's currently no git history to rebuild from.

**6. Local migrations predate the live database by months.**
`supabase/migrations/` has 13 files dated Aug–Sept 2025. The live project (`gdiudffqjhidreqzklbl`) was created 2026-01-05. The migration history in the repo doesn't represent the schema actually running in production — worth a fresh `supabase db pull`/snapshot so source control matches reality.

**7. Rate limiting may not be wired up where it's needed.**
The database has real rate-limit config (`rate_limits_config`: `ip_daily`=50, `email_daily`=50) and a working `increment_daily_counter` RPC, but the public, unauthenticated `contact-submit` function — the one most exposed to spam/abuse — doesn't call it anywhere in its source. Worth confirming which public endpoints (contact-submit, riley-chat) are actually protected before this goes live to real traffic.

## P2 — hygiene & polish

- **~17 TypeScript errors** across the app. Most are cosmetic (a duplicate `fontFamily` key in a stylesheet, type-only mismatches against library prop types). Two worth a look: `services/crm.ts:371` has a possibly-null `customer` access, and `services/profileService.ts:78` references a `User.outstandingBalance` property that doesn't exist on the type. `hooks/usePerformance.ts` is missing a `useState` import and would throw immediately if called — but nothing in the app imports that hook, so it's dead code rather than a live risk.
- Two versions of the Squarespace landing page live in the repo (`squarespace-landing-page.html`, `squarespace-landing-v2.html`) plus a separate `squarespace-sections.md` content guide. Worth confirming which one (if either) matches what's actually published, since they diverge (v1 uses Pexels stock photos + the Tally form; v2 is styling-only with no visible content section in what I reviewed).

## Website status

Checked the live, published site (inandoutmovin.com) directly on 2026-07-12, signed in via your existing Squarespace session.

- **Published and reachable** — not sitting in draft. Single site on the account, renews 2026-07-29.
- **Lead capture is correctly wired** — see the correction above. The quote form posts directly to the real `contact-submit` edge function.
- **Blank space at the bottom, root cause found:** the homepage's quote-request block is a Squarespace "Fluid Engine" section with a manually-set canvas height that's much taller than its actual content — the form and truck illustration only fill the top of it, leaving roughly 5,000+ pixels of empty canvas below before the footer. This is a page-builder setting, not a code bug — fixed inside Squarespace's page editor by opening that section in Fluid Engine edit mode and dragging its bottom resize handle up to match the real content height, not by CSS or code injection. I can drive this from the browser, but Fluid Engine's drag-resize is a fiddly canvas interaction to automate reliably sight-unseen — I'd like to walk through it with you live rather than risk a bad resize on your published site.
- **Hero photo:** no photo of a relocating family currently on the page — happy to source and add one, but since this touches the published site I want to confirm the image and placement with you before it goes live (adding/publishing site content needs your go-ahead per how I'm set up to work).

## Suggested order of attack

1. Fix the Supabase project ref in `.env` / EAS build config (P0 #1) — nothing else matters until the app can reach its real backend.
2. Wrap the root layout in `ErrorBoundary` (P0 #2) — five-minute fix, meaningfully reduces crash-to-blank-screen risk for app-store users.
3. Decide Tally vs. `contact-submit` as the source of truth for website leads and wire them together (P1 #4) — this is the actual "site and app talk to each other" fix you asked about.
4. Push current edge function source and a fresh migration snapshot into the GitHub repo (P1 #5, #6) so source control isn't fiction.
5. Confirm rate limiting is active on public-facing functions before real customer traffic (P1 #7).
6. Work through the TypeScript errors, prioritizing the ones on live code paths (`crm.ts`, `profileService.ts`, `notifications.ts`) over the cosmetic ones.
