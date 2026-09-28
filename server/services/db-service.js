import { db } from '../database/db';
import { authors, books, highlights, bookAuthors } from '../database/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export async function findOrCreateAuthor(name) {
    // Normalize name
    const normalizedName = name.trim();

    const existing = await db.select().from(authors).where(eq(authors.name, normalizedName)).limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    const [newAuthor] = await db.insert(authors).values({
        name: normalizedName,
    }).returning();

    return newAuthor;
}

export async function findOrCreateBook(title, authorId) {
    const existing = await db.select().from(books)
        .where(and(eq(books.title, title), eq(books.authorId, authorId)))
        .limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    const [newBook] = await db.insert(books).values({
        title,
        authorId,
    }).returning();

    return newBook;
}

// "ReWork!" -> "rework"
function normalizeTitle(title) {
    return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// "The Science of Getting Rich [Illustrated]: A Guide (Kindle Edition)" -> "the science of getting rich"
function looseTitle(title) {
    return normalizeTitle(title.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').split(':')[0]);
}

// "the intelligent investor" vs "the intelligent investor rev ed"
function isWordPrefix(short, long) {
    return short.split(' ').length >= 2 && long.startsWith(short + ' ');
}

const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md']);

// "Gary Keller, Dave Jenks, and Jay Papasan" -> {"keller", "jenks", "papasan"}
function authorSurnames(names) {
    const surnames = new Set();
    for (const name of names.split(/,|&|;|\band\b/i)) {
        const words = name.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '')
            .split(/\s+/).filter(w => w && !NAME_SUFFIXES.has(w));
        if (words.length) surnames.add(words[words.length - 1]);
    }
    return surnames;
}

// "123-456", "1,234", "Location: 1234" -> "123" / "1234"
function startLocation(location) {
    const match = String(location ?? '').replace(/,/g, '').match(/\d+/);
    return match ? match[0] : null;
}

async function fetchExistingHighlights(bookIds) {
    const existing = [];
    const BOOK_CHUNK_SIZE = 100;
    for (let i = 0; i < bookIds.length; i += BOOK_CHUNK_SIZE) {
        const bookChunk = bookIds.slice(i, i + BOOK_CHUNK_SIZE);
        existing.push(...await db
            .select({ id: highlights.id, text: highlights.text, bookId: highlights.bookId, location: highlights.location })
            .from(highlights)
            .where(inArray(highlights.bookId, bookChunk)));
    }
    return existing;
}

export async function saveHighlights(parsedClippings, { updateByLocation = false, dryRun = false } = {}) {
    let createdCount = 0;
    let skippedCount = 0;

    // 1. Bulk fetch existing authors and books to build cache
    const allAuthors = await db.select().from(authors);
    const allBooks = await db.select().from(books);

    // Map: "Name" -> ID
    const authorMap = new Map(allAuthors.map(a => [a.name, a.id]));
    // Map: "Title|AuthorId" -> ID
    const bookMap = new Map(allBooks.map(b => [`${b.title}|${b.authorId}`, b.id]));
    const booksById = new Map(allBooks.map(b => [b.id, b]));
    const asinMap = new Map(allBooks.filter(b => b.asin).map(b => [b.asin, b.id]));

    // Sources spell authors differently ("Gary Keller" vs "Gary Keller and Jay Papasan", "Michael   Lewis"),
    // so fuzzy matching needs a similar title plus at least one shared author surname.
    const authorNameById = new Map(allAuthors.map(a => [a.id, a.name]));
    const bookSurnames = new Map(allBooks.map(b => [b.id, authorSurnames(authorNameById.get(b.authorId) || '')]));
    for (const link of await db.select().from(bookAuthors)) {
        for (const s of authorSurnames(authorNameById.get(link.authorId) || '')) bookSurnames.get(link.bookId)?.add(s);
    }
    const titleIndex = allBooks.map(b => ({ id: b.id, full: normalizeTitle(b.title), loose: looseTitle(b.title), surnames: bookSurnames.get(b.id) }));

    const fuzzyCache = new Map();
    const fuzzyMatch = (clipping) => {
        const cacheKey = `${clipping.title}|${clipping.author}`;
        if (fuzzyCache.has(cacheKey)) return fuzzyCache.get(cacheKey);

        const full = normalizeTitle(clipping.title);
        const loose = looseTitle(clipping.title);
        const surnames = [...authorSurnames(clipping.author)];
        const sameAuthor = titleIndex.filter(b => surnames.some(s => b.surnames.has(s)));
        // Several same-title matches are existing duplicates, so take the oldest; several prefix matches are different books.
        const oldest = (list) => list.length ? Math.min(...list.map(b => b.id)) : undefined;
        const only = (list) => list.length === 1 ? list[0].id : undefined;

        const bookId = oldest(sameAuthor.filter(b => b.full === full))
            ?? (loose ? oldest(sameAuthor.filter(b => b.loose === loose)) : undefined)
            ?? (loose ? only(sameAuthor.filter(b => isWordPrefix(b.loose, loose) || isWordPrefix(loose, b.loose))) : undefined);
        fuzzyCache.set(cacheKey, bookId);
        return bookId;
    };

    // Existing books first matched by title that should now remember their ASIN: bookId -> asin
    const asinUpdates = new Map();

    const resolveBook = (clipping) => {
        if (clipping.asin && asinMap.has(clipping.asin)) return asinMap.get(clipping.asin);

        const authorId = authorMap.get(clipping.author.trim());
        const bookId = (authorId ? bookMap.get(`${clipping.title}|${authorId}`) : undefined) ?? fuzzyMatch(clipping);

        if (bookId && clipping.asin && !booksById.get(bookId)?.asin && !asinUpdates.has(bookId)) {
            asinUpdates.set(bookId, clipping.asin);
            asinMap.set(clipping.asin, bookId);
        }
        return bookId;
    };

    // 2. Identification Sets
    const authorsToInsert = new Map(); // Name -> { name }
    const booksToInsert = new Map();   // "Title|AuthorName" -> { title, authorName, asin }
    const clippingsToProcess = [];

    // 3. First Pass: Identify missing Authors & Books
    for (const clipping of parsedClippings) {
        if (clipping.type !== 'highlight') continue;
        clippingsToProcess.push(clipping);

        if (!resolveBook(clipping)) {
            const authorName = clipping.author.trim();
            if (!authorMap.has(authorName)) {
                authorsToInsert.set(authorName, { name: authorName });
            }
            const bookKey = `${clipping.title}|${authorName}`;
            if (!booksToInsert.has(bookKey)) {
                booksToInsert.set(bookKey, { title: clipping.title, authorName, asin: clipping.asin || null });
            }
        }
    }

    // Preview what an import would do, without writing anything.
    if (dryRun) {
        const resolvedIds = clippingsToProcess.map(c => resolveBook(c));
        const existing = await fetchExistingHighlights([...new Set(resolvedIds.filter(Boolean))]);
        const existingSet = new Set(existing.map(h => `${h.bookId}|${h.text}`));
        const alreadyHave = clippingsToProcess.filter((c, i) => resolvedIds[i] && existingSet.has(`${resolvedIds[i]}|${c.text}`)).length;
        return {
            dryRun: true,
            newAuthors: [...authorsToInsert.keys()],
            newBooks: [...booksToInsert.values()].map(({ title, authorName, asin }) => ({ title, author: authorName, asin })),
            existingBooksGainingAsin: asinUpdates.size,
            highlightsAlreadyInLibrary: alreadyHave,
            highlightsNewOrChanged: clippingsToProcess.length - alreadyHave,
        };
    }

    // 4. Batch Insert New Authors
    if (authorsToInsert.size > 0) {
        console.log(`Inserting/Fetching ${authorsToInsert.size} potential authors...`);
        const newAuthors = await db.insert(authors)
            .values(Array.from(authorsToInsert.values()))
            .onConflictDoNothing() // Guard against race conditions
            .returning();

        console.log(`Inserted ${newAuthors.length} new authors.`);

        for (const a of newAuthors) {
            authorMap.set(a.name, a.id);
        }

        // Re-fetch in case onConflictDoNothing skipped some (race condition edge case)
        if (newAuthors.length !== authorsToInsert.size) {
            const reFetch = await db.select().from(authors);
            reFetch.forEach(a => authorMap.set(a.name, a.id));
        }
    }

    // 5. Batch Insert New Books
    const bookValues = [];
    for (const val of booksToInsert.values()) {
        const authorId = authorMap.get(val.authorName);
        if (authorId) {
            bookValues.push({ title: val.title, authorId, asin: val.asin });
        }
    }

    if (bookValues.length > 0) {
        console.log(`Inserting ${bookValues.length} new books...`);
        const newBooks = await db.insert(books).values(bookValues).returning();
        for (const b of newBooks) {
            bookMap.set(`${b.title}|${b.authorId}`, b.id);
            booksById.set(b.id, b);
            if (b.asin) asinMap.set(b.asin, b.id);
        }
    }

    // 6. Resolve every clipping to a book
    const involvedBookIds = new Set();
    const finalClippings = []; // { ...clipping, bookId, authorId }

    for (const clipping of clippingsToProcess) {
        const authorIdFromName = authorMap.get(clipping.author.trim());
        const bookId = resolveBook(clipping);
        if (!bookId) continue;

        const authorId = booksById.get(bookId)?.authorId ?? authorIdFromName;
        involvedBookIds.add(bookId);
        finalClippings.push({ ...clipping, authorId, bookId });
    }

    if (finalClippings.length < clippingsToProcess.length) {
        console.log(`Could not resolve a book for ${clippingsToProcess.length - finalClippings.length} / ${clippingsToProcess.length} clippings`);
    }

    if (asinUpdates.size > 0) {
        console.log(`Saving ASINs on ${asinUpdates.size} existing books...`);
        for (const [bookId, asin] of asinUpdates) {
            await db.update(books).set({ asin }).where(eq(books.id, bookId));
        }
    }

    // 7. Duplicate check against existing highlights for the involved books only
    console.log(`Checking for duplicates across ${involvedBookIds.size} books...`);

    const existingHighlights = await fetchExistingHighlights(Array.from(involvedBookIds));

    const existingSet = new Set(existingHighlights.map(h => `${h.bookId}|${h.text}`));
    console.log(`Found ${existingHighlights.length} existing highlights to check against`);

    const byLocation = new Map(); // "BookID|StartLocation" -> existing highlight
    if (updateByLocation) {
        for (const h of existingHighlights) {
            const loc = startLocation(h.location);
            if (loc) byLocation.set(`${h.bookId}|${loc}`, h);
        }
    }

    const highlightsToInsert = [];
    const highlightUpdates = [];

    for (const c of finalClippings) {
        const textKey = `${c.bookId}|${c.text}`;
        if (existingSet.has(textKey)) {
            skippedCount++;
            continue;
        }
        existingSet.add(textKey);

        // A highlight widened or trimmed on the Kindle keeps its start location, so replace
        // the stored text instead of adding a near-duplicate.
        const loc = updateByLocation ? startLocation(c.location) : null;
        const sameSpot = loc ? byLocation.get(`${c.bookId}|${loc}`) : null;
        if (sameSpot && (c.text.includes(sameSpot.text) || sameSpot.text.includes(c.text))) {
            highlightUpdates.push({ id: sameSpot.id, text: c.text, location: c.location });
            sameSpot.text = c.text;
            continue;
        }

        highlightsToInsert.push({
            text: c.text,
            bookId: c.bookId,
            authorId: c.authorId,
            location: c.location,
            originalDate: c.date,
            createdAt: new Date()
        });
    }

    for (const u of highlightUpdates) {
        await db.update(highlights).set({ text: u.text, location: u.location }).where(eq(highlights.id, u.id));
    }
    const updatedCount = highlightUpdates.length;

    // 8. Bulk Insert Highlights (Chunked)
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < highlightsToInsert.length; i += CHUNK_SIZE) {
        const chunk = highlightsToInsert.slice(i, i + CHUNK_SIZE);
        await db.insert(highlights).values(chunk);
        createdCount += chunk.length;
    }

    // Award XP with Context (Genre, Author, Demographics)
    if (createdCount > 0) {
        const { onHighlightAddedWithContext } = await import('./gamification.js');

        // We need to rebuild context for the inserted highlights
        // Since highlightsToInsert has bookId and authorId, we can look up the rest

        // Optimize: Fetch all needed books and authors once
        const usedBookIds = [...new Set(highlightsToInsert.map(h => h.bookId))];
        const usedAuthorIds = [...new Set(highlightsToInsert.map(h => h.authorId))];

        const booksData = await db.query.books.findMany({
            where: inArray(books.id, usedBookIds),
            columns: { id: true, genre: true, tags: true }
        });
        const authorsData = await db.query.authors.findMany({
            where: inArray(authors.id, usedAuthorIds),
            columns: { id: true, gender: true, race: true, nationality: true }
        });

        const bookMap = new Map(booksData.map(b => [b.id, b]));
        const authorMap = new Map(authorsData.map(a => [a.id, a]));

        const highlightsContext = highlightsToInsert.map(h => {
            const book = bookMap.get(h.bookId);
            const author = authorMap.get(h.authorId);
            return {
                authorId: h.authorId,
                bookId: h.bookId,
                genre: book?.genre,
                tags: book?.tags || [],
                gender: author?.gender,
                race: author?.race,
                nationality: author?.nationality
            };
        });

        await onHighlightAddedWithContext(highlightsContext);
    }

    return { createdCount, updatedCount, skippedCount };
}
