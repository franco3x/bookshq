# 8. Keep the repository public, including personal reading data

## Status

Accepted

## Context

The BooksHQ repository (https://github.com/franco3x/bookshq) is public, and it contains personal data files tracked in git history: a `readwise-data.csv` export (~5.5MB of book titles and quote text) and a Goodreads library export CSV. This was reviewed explicitly on 2026-08-13, prompted by noticing these files were present and asking whether that was intentional/acceptable.

## Decision

Keep the repository public, and keep the personal data files in git history as-is. No history rewrite (e.g. `git filter-repo` / BFG to scrub the files from past commits) was performed or planned.

The reasoning: the contents of these files are just book titles and quote/highlight text — not the kind of sensitive personal information (financial, medical, credentials, precise location/contact info, etc.) that would typically justify the effort and disruption of a history rewrite on a solo project's repo.

## Consequences

- Anyone can see the user's reading history and highlighted quotes by browsing the public repo. This is an accepted, deliberate tradeoff, not an oversight.
- `.gitignore` was separately confirmed to be committed and enforced going forward (see `CLAUDE.md`'s "Recently fixed" history) — this prevents *future* accidental additions of files that shouldn't be tracked, but does not retroactively affect the CSVs already in history, consistent with the decision made here to leave existing history alone.
- If this judgment changes later (e.g. the reading data becomes something the user would rather not have public, or the repo needs to include genuinely sensitive data in the future), revisit this decision explicitly — don't assume more sensitive data can be added to the repo under the same reasoning that applied to book titles and quotes.
