# 5. Support CSV/txt imports only; explicitly do not build direct Kindle scraping

## Status

Superseded by [ADR 0009](0009-kindle-sync-via-bookmarklet.md) (2026-09-27)

## Context

BooksHQ supports bringing in existing reading data via file-based imports: a Goodreads library CSV export, and highlights via either a Kindle "My Clippings.txt" file or a Readwise CSV export. A live/direct Kindle highlight sync (skipping the manual file-export step) was discussed and explicitly considered on 2026-08-13, prompted by the user no longer having reliable access to Readwise (subscription lapsed, and Readwise has since removed its free tier).

There is no official Amazon API for Kindle highlights. The only known paths to a "direct" sync are:

- Scraping Amazon's `read.amazon.com/notebook` page — which is what Readwise's own auto-sync does under the hood — either manually per-book via a bookmarklet (e.g. Bookcision, https://readwise.io/bookcision), or via a scripted bulk scraper (e.g. https://github.com/parroty/kindle-your-highlights, https://github.com/ryangreenberg/kindle-exporter).

All of these options are unofficial, fragile to Amazon's markup changes (no stability guarantee), and sit in a gray area with respect to Amazon's Terms of Service around automation.

## Decision

Do not build a direct/live Kindle scraping integration. Continue supporting only file-based imports: Goodreads CSV, Readwise CSV, and Kindle `My Clippings.txt`.

For getting *new* highlights into the app without a Readwise subscription, the recommended paths (in order of preference) are: (1) use the Kindle Cloud Reader or Kindle mobile/desktop apps in combination with a manual clippings export if/when that becomes available through those apps; (2) manually enter highlights directly into BooksHQ via a planned manual "Add Highlight" entry form (not yet built as of this writing); (3) as a last resort and with awareness of the fragility/ToS caveats above, a one-off per-book bookmarklet tool like Bookcision for occasional bulk copy-paste import, rather than building bulk-scraper automation into the app itself.

## Consequences

- The app avoids taking on a maintenance burden for scraping code that would break unpredictably whenever Amazon changes its page markup, and avoids the ToS ambiguity of automating access to `read.amazon.com`.
- Without Readwise, there is a real gap for *frictionless* ongoing highlight capture — this is a known, accepted tradeoff, not an oversight. It motivated the still-open idea of a manual highlight-entry form as a workaround (see `CLAUDE.md`'s "Next steps" for status).
- This decision should be revisited if either: Amazon ships an official highlights export/API, or the manual Clippings.txt / no-Readwise friction becomes painful enough in practice to justify accepting the scraping fragility and ToS risk after all.

*Corrected 2026-09-27: removed an inaccurate statement that the user did not own a physical Kindle. It played no part in the decision, which is unchanged.*
