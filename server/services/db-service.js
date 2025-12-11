import { db } from '../database/db';
import { authors, books, highlights } from '../database/schema';
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

export async function saveHighlights(parsedClippings) {
    let createdCount = 0;
    let skippedCount = 0;

    // 1. Bulk fetch existing authors and books to build cache
    const allAuthors = await db.select().from(authors);
    const allBooks = await db.select().from(books);

    // Map: "Name" -> ID
    const authorMap = new Map(allAuthors.map(a => [a.name, a.id]));
    // Map: "Title|AuthorId" -> ID
    const bookMap = new Map(allBooks.map(b => [`${b.title}|${b.authorId}`, b.id]));

    // 2. Identification Sets
    const authorsToInsert = new Map(); // Name -> { name }
    const booksToInsert = new Map();   // "Title|AuthorName" -> { title, authorName }
    const clippingsToProcess = [];

    // 3. First Pass: Identify missing Authors & Books
    for (const clipping of parsedClippings) {
        if (clipping.type !== 'highlight') continue;

        const authorName = clipping.author.trim();
        if (!authorMap.has(authorName)) {
            authorsToInsert.set(authorName, { name: authorName });
        }

        // We can't key by AuthorID yet because we might not have it.
        // Key by Title + AuthorName temporarily
        const bookKey = `${clipping.title}|${authorName}`;
        // We also need to check if we already have it in DB (but authorID check is tricky if author is new)
        // For simplicity: If author is new, book is definitely new. 
        // If author exists, check bookMap.
        const authorId = authorMap.get(authorName);
        if (!authorId || !bookMap.has(`${clipping.title}|${authorId}`)) {
            // Avoid duplicates in batch
            if (!booksToInsert.has(bookKey)) {
                booksToInsert.set(bookKey, { title: clipping.title, authorName: authorName });
            }
        }

        clippingsToProcess.push(clipping);
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
            console.log('Refetching all authors to ensure map is complete...');
            const reFetch = await db.select().from(authors);
            reFetch.forEach(a => authorMap.set(a.name, a.id));
            console.log(`Author map size after refetch: ${authorMap.size}`);
        }
    }

    // 5. Batch Insert New Books
    // Now we have IDs for all authors
    const bookValues = [];
    for (const [key, val] of booksToInsert) {
        const authorId = authorMap.get(val.authorName);
        if (authorId) {
            bookValues.push({ title: val.title, authorId });
        } else {
            // DEBUG: why missing?
            if (bookValues.length < 5) console.log(`Missing author ID for book insert: ${val.authorName}`);
        }
    }

    if (bookValues.length > 0) {
        console.log(`Inserting/Fetching ${bookValues.length} potential books...`);
        const newBooks = await db.insert(books)
            .values(bookValues)
            .onConflictDoNothing()
            .returning();

        console.log(`Inserted ${newBooks.length} new books.`);

        for (const b of newBooks) {
            bookMap.set(`${b.title}|${b.authorId}`, b.id);
        }
        // Re-fetch safety
        if (newBooks.length !== bookValues.length) {
            console.log('Refetching all books to ensure map is complete...');
            const reFetchBooks = await db.select().from(books);
            reFetchBooks.forEach(b => bookMap.set(`${b.title}|${b.authorId}`, b.id));
            console.log(`Book map size after refetch: ${bookMap.size}`);
        }
    }

    // 6. Filter Highlights (Batch Duplicate Check)
    // Fetch all existing highlights? Too big. 
    // Optimization: Construct a giant "WHERE (text = ? AND book_id = ?) OR ..." query is cleaner but max query size limits.
    // Better: We optimistically insert with ON CONFLICT DO NOTHING if we had a constraint.
    // Drizzle schema doesn't strictly enforce unique text+bookId yet in the arrays I saw, but let's assume we want to avoid it.
    // For V1 Speed: Let's do a bulk insert with `onConflictDoNothing` if we add a unique index, or just insert them all if checks are hard.
    // But duplicate highlights are annoying.

    // Let's create a "Signature" set of what we are trying to insert
    const highlightsToInsert = [];

    // We really should query existing highlights for the books involved. 
    // Collect all involved Book IDs
    const involvedBookIds = new Set();
    const finalClippings = []; // { ...clipping, bookId, authorId }

    let debugMisses = 0;
    for (const clipping of clippingsToProcess) {
        const authorId = authorMap.get(clipping.author.trim());

        // Ensure we try to find the book even if authorId comes from map (it should)
        let bookId;
        if (authorId) {
            bookId = bookMap.get(`${clipping.title}|${authorId}`);
        }

        if (authorId && bookId) {
            involvedBookIds.add(bookId);
            finalClippings.push({ ...clipping, authorId, bookId });
        } else {
            if (debugMisses < 5) {
                console.log(`Failed to resolve for clipping: "${clipping.title}" by "${clipping.author}"`);
                console.log(`- Author found? ${!!authorId} (ID: ${authorId})`);
                console.log(`- Book lookup key: "${clipping.title}|${authorId}"`);
                console.log(`- Book found? ${!!bookId}`);
                if (!bookId && authorId) {
                    // Check if book map has ANY entry for this author
                    // This is expensive logging, careful
                }
                debugMisses++;
            }
        }
    }

    if (debugMisses > 0) {
        console.log(`Total clippings failed to resolve: ${clippingsToProcess.length - finalClippings.length} / ${clippingsToProcess.length}`);
    }

    // Fetch existing highlights for these books only (Optimization)
    // Only query highlights for the specific books we're importing
    console.log(`Checking for duplicates across ${involvedBookIds.size} books...`);

    let existingHighlights = [];
    if (involvedBookIds.size > 0) {
        const bookIdsArray = Array.from(involvedBookIds);
        // For very large imports, chunk the WHERE IN query
        const BOOK_CHUNK_SIZE = 100;
        for (let i = 0; i < bookIdsArray.length; i += BOOK_CHUNK_SIZE) {
            const bookChunk = bookIdsArray.slice(i, i + BOOK_CHUNK_SIZE);
            const chunkHighlights = await db
                .select({ text: highlights.text, bookId: highlights.bookId })
                .from(highlights)
                .where(inArray(highlights.bookId, bookChunk));
            existingHighlights.push(...chunkHighlights);

            if (i % 300 === 0 && i > 0) {
                console.log(`Checked ${i}/${bookIdsArray.length} books for duplicates...`);
            }
        }
    }

    // Memory Set of existing "BookID|TextHash"
    const existingSet = new Set(existingHighlights.map(h => `${h.bookId}|${h.text}`));
    console.log(`Found ${existingHighlights.length} existing highlights to check against`);

    for (const c of finalClippings) {
        if (!existingSet.has(`${c.bookId}|${c.text}`)) {
            highlightsToInsert.push({
                text: c.text,
                bookId: c.bookId,
                authorId: c.authorId,
                location: c.location,
                originalDate: c.date,
                createdAt: new Date()
            });
            // Add to set to prevent duplicates within the upload file itself
            existingSet.add(`${c.bookId}|${c.text}`);
        } else {
            skippedCount++;
        }

        // Progress logging for large imports
        if ((highlightsToInsert.length + skippedCount) % 1000 === 0) {
            console.log(`Processed ${highlightsToInsert.length + skippedCount}/${finalClippings.length} highlights...`);
        }
    }

    // 7. Bulk Insert Highlights (Chunked to prevent packet too large)
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < highlightsToInsert.length; i += CHUNK_SIZE) {
        const chunk = highlightsToInsert.slice(i, i + CHUNK_SIZE);
        await db.insert(highlights).values(chunk);
        createdCount += chunk.length;
    }

    // Award XP
    if (createdCount > 0) {
        const { onHighlightAdded } = await import('./gamification.js');
        await onHighlightAdded(createdCount);
    }

    return { createdCount, skippedCount };
}
