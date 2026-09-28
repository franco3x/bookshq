# 10. Import book matching: ASIN, then exact title + author, then fuzzy title with a shared surname

## Status

Accepted (2026-09-27)

## Context

Highlights reach BooksHQ from several sources — Readwise CSV, Kindle `My Clippings.txt`, and the Kindle notebook bookmarklet ([ADR 0009](0009-kindle-sync-via-bookmarklet.md)) — and every import has to decide whether each incoming book is one the library already has or a new one. All of them go through `saveHighlights` in `server/services/db-service.js`.

Until 2026-09-27 a book matched only on the exact pair `title|authorId`, where the author was looked up by exact name. That worked when every import came from Readwise, because the names were always spelled the same way. The Kindle notebook spells them differently:

- It lists every co-author ("Gary Keller and Jay Papasan") where the library has only the first ("Gary Keller").
- Spacing and initials differ ("Michael   Lewis" vs "Michael Lewis", "A. W. (Aiden Wilson) Tozer" vs "A.W. Tozer").
- Titles carry edition or series tags ("… (King Legacy Book 4)", "… [Illustrated]", "…, Revised and Expanded Edition").
- Many `books.asin` values are print ISBNs from the Goodreads import (e.g. `9780393254600`), which never equal a Kindle ASIN (`B0…`).

A dry-run preview of the first notebook sync reported 61 "new" books; about 55 of them were books already in the library. Importing as-is would have duplicated those books along with thousands of their highlights.

## Decision

`saveHighlights` resolves each incoming book in this order, stopping at the first match:

1. **ASIN**, when the incoming record has one and a book already carries it.
2. **Exact `title|authorId`**, the original rule, kept for speed and backward compatibility.
3. **Fuzzy title match**, but only among books that share at least one author **surname** with the incoming record. Surnames come from both the legacy `books.authorId` author and every `book_authors` link; suffixes like Jr./Ph.D. and parenthesized middle names are ignored. Three title comparisons are tried, strictest first:
   - normalized full title (case- and punctuation-insensitive); if several books match, they are existing duplicates, so take the oldest;
   - "loose" title (bracketed/parenthesized text removed, subtitle after `:` dropped); again take the oldest on a tie;
   - word-prefix match ("the intelligent investor" vs "the intelligent investor rev ed"), accepted **only if exactly one** book qualifies, since several prefix matches usually mean genuinely different books (e.g. *The 12 Week Year* vs *The 12 Week Year Field Guide*).

Requiring a shared surname is what keeps loose title matching safe: two different books with similar titles rarely share an author.

When a book is matched by title and the incoming record has an ASIN, that ASIN is saved on the book (only if its `asin` is empty), so later syncs match it exactly at step 1. As a one-off before the first sync, ASINs from `readwise-data.csv` were backfilled onto 173 existing books whose `asin` was empty; together with ASINs saved during the first sync, 389 of 408 books now carry one.

Separately, notebook imports pass `updateByLocation`: an incoming highlight whose text differs from an existing highlight at the same starting location, where one text contains the other, **replaces** that text rather than adding a near-duplicate. This covers highlights widened or trimmed after they were first saved. It is deliberately **not** used for `My Clippings.txt`, because that file keeps every old version of an edited highlight and would revert newer text to older text.

## Consequences

- On the same notebook data, "new" books dropped from 61 to 7, of which 6 were genuinely new. The one known miss is *The Millionaire Next Door (Millionaire Set Book 2)*, credited to William D. Danko alone, which shares no surname with the existing copy credited to Thomas J. Stanley. It was left for the Merge Portal instead of loosening the rules.
- A small risk of a false merge remains: two different books by authors who share a surname and whose titles normalize identically. Taking the oldest book on ties at the two strict levels, and requiring a single candidate at the prefix level, keeps that risk narrow. The `?dryRun=1` preview on the notebook endpoint is the tool for checking a large import before it writes anything.
- The rules apply to every highlight import, so Readwise CSV and Clippings imports benefit too. The Readwise parser already read ASINs; they are now used instead of being thrown away.
- Books whose `asin` holds a print ISBN keep going through fuzzy matching on every sync. That works, but it is slower and not exact. Overwriting those ISBNs with Kindle ASINs was not done, since the ISBN may be meaningful to the Goodreads data.
- Author records are still created from the incoming name when a book is genuinely new, so notebook-style multi-author strings ("Charles Van Doren and Mortimer J. Adler") can appear as a single author record, just as Readwise-imported ones already do.
