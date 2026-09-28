# 4. Three-tier gamification system (global, per-author, per-category)

## Status

Accepted

## Context

BooksHQ includes an XP/leveling gamification layer on top of the core book/highlight tracking. A design choice was made early on to track leveling at three separate tiers rather than a single overall score:

- A global reader level (`user_stats`)
- A per-author level (`author_levels`)
- Levels per category dimension — genre, gender, race, nationality (`category_levels`)

Plus a full achievement system (static and dynamically generated achievements, e.g. per-genre/per-nationality/per-vocation) layered on top of all three.

## Decision

Keep the three-tier structure as-is. This was built because it was an engaging, fun feature to add — it was not the product of a specific strategic design goal around engagement mechanics or reading-diversity incentives worked out in advance. It's documented here as a decision (not left undocumented) because it has real, non-trivial consequences on the schema and on future feature work, even though the original motivation was simply "this seemed like a fun thing to build."

## Consequences

- Three tiers means three places that need XP recalculation logic to stay in sync (`server/services/stats.js`'s `recalculateStats()` is invoked from many call sites across the route files — book reads, bulk reads, author merges, etc. — specifically because there are three tiers, not one, that can be affected by a single action).
- The multi-author junction table (ADR 0002) exists partly *because* per-author leveling needs to correctly attribute XP across co-authored books — the two decisions are linked even though they were made somewhat independently.
- Because there wasn't a deliberate design goal behind the three-tier structure, there's no test to hold future changes accountable to (e.g. "does this still meaningfully encourage genre diversity?") — the system can be freely simplified, extended, or reworked without needing to honor an original strategic intent, since there wasn't one. Future changes to gamification should feel free to treat this as an experiment that can evolve, not a fixed design pillar.
- The achievement system's per-genre/nationality/vocation dynamic achievements depend on the per-category tier existing; removing or merging tiers would require updating achievement-generation logic in `server/services/achievements.js` accordingly.
