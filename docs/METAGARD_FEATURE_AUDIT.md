# Metagard feature audit (engineering agent)

## 1. Analysis before changes

### Existing (complete enough to keep)

| Area | Implementation |
|------|------------------|
| Auth / session | Supabase auth, `getProfile`, login callback |
| Create build | `CreateBuildForm` + `POST /api/builds` → `createBuild` (name, class, level, LTP) |
| Edit spells | `BuildSpellEditor` + `PUT /api/builds/[id]/spells`, caster/martial budgets, LTP +1 for casters |
| View build | `builds/[id]/page` + `BuildSpellDetails` |
| Edit build (partial) | `BuildSettingsForm`: name, level, LTP, notes, **delete build** |
| Saved builds | `saved_builds` table, `SaveBuildButton`, `toggleSavedBuild`, `getSavedBuilds` |
| Public builds list | `builds/page.tsx` (flat table, not grouped) |
| Catalog | `spells`, `classes`, `class_spell_rules`, `getCatalogSpellsForClass`, generator SQL |
| Patch notes | `patch_notes` + page |
| Meta feedback | `bugs-and-features` (email only, no DB tickets) |

### Partially implemented

| Gap | Notes |
|-----|--------|
| `average_rating` on builds | Displayed; **no** `build_ratings` table or submit UI (now added). |
| Profile | Page exists but only JSON dump; **no** favorites, graphs, achievements UI. |
| Build metadata | Only `notes`; **no** structured play style / priority / synergy / enemies / gear (now added as columns). |
| Settings | **Class** not editable in settings (now added). |

### Missing (before this pass)

- Rate build (1–5, once per user) with DB enforcement  
- Comments on builds  
- Clone build  
- Builds grouped by class (UI)  
- Leaderboards  
- Spell browser, spell rating, grouping by type/school  
- Profile: my builds, saved builds, favorites  
- Monsters, custom classes, battlegames, custom spells (full CRUD + ratings)  
- Achievements, favorite graphs (charts)  
- DB-backed bug/feature queue  

### This implementation pass (scope)

**Delivered end-to-end:** extended build fields, build ratings + average sync, comments, clone, class in settings, spells index + filters + spell rating, build leaderboards, profile hub (my/saved builds, favorites via API), SQL + RLS for user-generated entities (monsters, custom_classes, battle_games, custom_spells) with rating tables and minimal list/create API + pages.

**Explicitly deferred (assumptions documented):**

- **Achievements / S-tier builder**: requires rules engine + migrations; extend `profile_achievements` later.  
- **Favorite class / battlegame graphs**: needs chart lib + aggregation queries; favorites stored as text on `profiles` for now.  
- **Bug/feature DB**: email flow kept; optional `feedback_tickets` table can be added similarly to comments.  
- **Discord**: optional `NEXT_PUBLIC_DISCORD_URL` in nav when set.  

### Schema rationale

- **Normalized ratings** in junction tables `(user_id, entity_id, rating)` with **primary key (user_id, entity_id)** enforces rate-once at the database.  
- **Parent `average_rating`** updated by trigger (builds, spells) or by API (UGC tables) for fast list sorting.  
- **Build extended fields** are nullable text columns to avoid JSON proliferation for simple copy.  
- **UGC tables** share shape: `owner_id`, `name`, `description`, `average_rating` for consistent leaderboards.

Run new SQL in Supabase SQL Editor after review: `supabase/policies/metagard_extended_features.sql`.

## 2. Implemented in repo (checklist)

| Feature | Location / notes |
|---------|-------------------|
| Extended build fields + PATCH | `BuildSettingsForm`, `PATCH /api/builds/[id]` |
| Rate build (1–5, once) | `build_ratings`, `POST /api/builds/[id]/rating`, `BuildRatingSection` |
| Comments | `build_comments`, `GET/POST /api/builds/[id]/comments`, `BuildCommentsSection` |
| Clone build | `cloneBuild`, `POST /api/builds/[id]/clone`, `CloneBuildButton` |
| Builds grouped by class | `src/app/builds/page.tsx` |
| Build leaderboards | `src/app/leaderboards/page.tsx` |
| Spell list + group by type/school | `src/app/spells/page.tsx` |
| Spell detail + rate | `src/app/spells/[id]/page.tsx`, `POST /api/spells/[id]/rating` |
| Spell leaderboard | `src/app/leaderboards/spells/page.tsx` |
| Profile: favorites | `PATCH /api/profile`, `ProfileFavoritesForm` |
| Profile: my / saved builds, delete, unsave | `src/app/profile/page.tsx`, `DeleteBuildButton`, `UnsaveSavedBuildButton` |
| Monsters + ratings | `src/app/monsters/**`, `POST /api/monsters`, rating route |
| Custom classes + ratings | `src/app/custom-classes/**`, `/api/custom-classes` |
| Battlegames + ratings | `src/app/battle-games/**`, `/api/battle-games` |
| Custom spells + ratings | `src/app/custom-spells/**`, `/api/custom-spells` |
| Navigation | `Navbar.tsx` (Spells, Leaderboards, UGC, optional `NEXT_PUBLIC_DISCORD_URL`) |

**Still deferred:** profile achievement badges, favorite graphs (charting), DB-backed bug/feature tickets (email flow remains), “custom grouping” for spells beyond type/school (would need a `spell_groups` table + admin UI).

## 3. Unified Bayesian tier system (new)

### What was missing

- No shared tier model across entities.
- All UIs and leaderboards used raw averages (`average_rating`) directly.
- APIs returned raw averages or simple `{ ok: true }` responses after rating writes.

### What was added

- Shared tier engine in `src/lib/tier.ts`:
  - Bayesian weighted rating with smoothing `m = 10`
  - Tier mapping: `S+`, `S`, `A`, `B`, `C`, `D`, `F`
- Shared rating aggregation helpers in `src/lib/queries/ratingStats.ts`:
  - global average `C` by rating table
  - vote + raw-average rollups by numeric/string entity keys
- Tier badge component in `src/components/TierBadge.tsx`
- Tier data surfaced for rated entities:
  - Builds, Spells, Monsters, Custom classes, Battlegames, Custom spells, and Classes
  - List pages, detail pages, and leaderboards now show weighted rating + tier (+ vote counts)
  - Rating APIs now return weighted/tier payload in response
- Leaderboards updated to sort by:
  1. Tier rank (`S+` → `F`)
  2. Weighted rating (desc)
  3. Vote count (desc)
  4. Newest/name fallback depending on available fields

### Why Bayesian weighting

- Prevents low-vote entities from jumping to extreme tiers on a single 5-star vote.
- Keeps `S+`/`S`/`F` rare without requiring hard minimum-vote rules.
- Still allows well-rated, high-vote entities to rise predictably.
