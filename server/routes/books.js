import express from 'express';
import { db } from '../database/db.js';
import { books, authors, highlights, authorLevels, bookAuthors } from '../database/schema.js';
import { eq, desc, sql, and, ne } from 'drizzle-orm';
import { fetchBookCover } from '../services/cover-fetcher.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await db.query.books.findMany({
            with: {
                author: true, // Legacy
                bookAuthors: {
                    with: {
                        author: true
                    }
                },
                highlights: true
            },
            orderBy: desc(books.dateLastRead)
        });

        // Format for frontend
        const formatted = result.map(book => ({
            ...book,
            // Provide a clean authors array
            authors: book.bookAuthors.map(ba => ba.author),
            // Legacy support (use first author or direct link)
            author: book.author || (book.bookAuthors[0] ? book.bookAuthors[0].author : null),
            highlightCount: book.highlights.length
        }));

        res.json(formatted);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const book = await db.query.books.findFirst({
            where: eq(books.id, parseInt(req.params.id)),
            with: {
                author: true,
                bookAuthors: {
                    with: {
                        author: true
                    }
                },
                highlights: {
                    orderBy: sql`CAST(${highlights.location} AS INTEGER) ASC`
                }
            }
        });
        if (!book) return res.status(404).json({ error: 'Book not found' });

        // Format for frontend
        const formatted = {
            ...book,
            authors: book.bookAuthors.map(ba => ba.author),
            author: book.author || (book.bookAuthors[0] ? book.bookAuthors[0].author : null)
        };

        res.json(formatted);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Must stay registered before POST /bulk/read: both match this path shape, and the
// isNaN(bookId) -> next() guard below is what lets "bulk" fall through to that route.
router.post('/:id/read', async (req, res, next) => {
    const bookId = parseInt(req.params.id);

    // If id is not a valid integer, skip this route and let Express try other routes
    if (isNaN(bookId)) {
        return next();
    }

    try {
        const book = await db.query.books.findFirst({
            where: eq(books.id, bookId)
        });

        if (!book) return res.status(404).json({ error: 'Book not found' });

        const isFirstRead = (book.readCount || 0) === 0;
        const newCount = (book.readCount || 0) + 1;
        const now = new Date();

        await db.update(books)
            .set({
                readCount: newCount,
                dateLastRead: now,
                dateFirstRead: isFirstRead ? now : book.dateFirstRead
            })
            .where(eq(books.id, bookId));

        // Check Achievements first (so they count towards stats)
        const { checkAchievements } = await import('../services/achievements.js');
        const newAchievements = await checkAchievements(1, ['READ']).catch(console.error);

        // Trigger XP Recalculation (includes new achievements)
        const { recalculateStats } = await import('../services/stats.js');
        await recalculateStats().catch(console.error);

        const xpResult = await db.query.userStats.findFirst();

        res.json({
            success: true,
            readCount: newCount,
            xpAwarded: isFirstRead ? 100 : 50,
            ...xpResult
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Decrement read count (Undo accidental double-mark)
router.patch('/:id/read/decrement', async (req, res) => {
    const bookId = parseInt(req.params.id);

    try {
        const book = await db.query.books.findFirst({
            where: eq(books.id, bookId)
        });

        if (!book) return res.status(404).json({ error: 'Book not found' });
        if ((book.readCount || 0) === 0) {
            return res.status(400).json({ error: 'Book has not been marked as read yet' });
        }

        const newCount = Math.max(0, (book.readCount || 0) - 1);

        await db.update(books)
            .set({ readCount: newCount })
            .where(eq(books.id, bookId));

        // Recalculate stats to reflect the change
        const { recalculateStats } = await import('../services/stats.js');
        await recalculateStats().catch(console.error);

        const xpResult = await db.query.userStats.findFirst();

        res.json({
            success: true,
            readCount: newCount,
            ...xpResult
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Bulk mark as read
router.post('/bulk/read', async (req, res) => {
    const { bookIds } = req.body;
    if (!bookIds || !Array.isArray(bookIds)) {
        return res.status(400).json({ error: 'Invalid bookIds' });
    }

    // Sanitize bookIds to ensure we don't pass NaN to the DB
    const safeBookIds = bookIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (safeBookIds.length === 0) {
        return res.status(400).json({ error: 'No valid book IDs provided' });
    }

    try {
        const now = new Date();

        // 1. Get current books to check if they are already read (for first-read logic)
        const targets = [];
        for (const id of safeBookIds) {
            const [b] = await db.select().from(books).where(eq(books.id, id));
            if (b) targets.push(b);
        }

        // 2. Update all to increment readCount
        let totalXP = 0;

        await db.transaction(async (tx) => {
            for (const book of targets) {
                const isFirstRead = (book.readCount || 0) === 0;

                await tx.update(books)
                    .set({
                        readCount: sql`COALESCE(read_count, 0) + 1`,
                        dateLastRead: now,
                        dateFirstRead: isFirstRead ? now : book.dateFirstRead
                    })
                    .where(eq(books.id, book.id));

                totalXP += isFirstRead ? 100 : 50;
            }
        });

        // 3. Trigger achievements and stats
        try {
            const { checkAchievements } = await import('../services/achievements.js');
            await checkAchievements(1, ['READ']);
        } catch (e) {
            console.error('[BulkRead] Achievement Error:', e);
        }

        try {
            const { recalculateStats } = await import('../services/stats.js');
            await recalculateStats();
        } catch (e) {
            console.error('[BulkRead] Stats Error:', e);
        }

        res.json({ success: true, count: bookIds.length });
    } catch (e) {
        console.error('[BulkRead] Main Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Helper: Title Case
const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

// Bulk update tags for multiple books
router.post('/bulk/tags', async (req, res) => {
    try {
        const { bookIds, tags } = req.body;

        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ error: 'bookIds must be a non-empty array' });
        }

        if (!Array.isArray(tags)) {
            return res.status(400).json({ error: 'tags must be an array' });
        }

        // Normalize tags
        const normalizedTags = tags.map(t => toTitleCase(t));

        // Update all specified books with the new tags
        const { inArray } = await import('drizzle-orm');
        await db.update(books)
            .set({ tags: normalizedTags })
            .where(inArray(books.id, bookIds));

        res.json({ success: true, updated: bookIds.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update book details (e.g., genre, dateLastRead, authors)
router.patch('/:id', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const { genre, dateLastRead, authorIds } = req.body;

        const updateData = {};
        if (genre !== undefined) {
            // Normalize genre
            updateData.genre = Array.isArray(genre) ? genre.map(g => toTitleCase(g)) : [];
        }
        if (dateLastRead !== undefined) updateData.dateLastRead = new Date(dateLastRead);

        // Handle authors update if provided
        if (authorIds !== undefined && Array.isArray(authorIds)) {
            // 1. Transactional update of book_authors
            const removedAuthorIds = [];
            await db.transaction(async (tx) => {
                // Get existing authors first to see who is being removed
                const existingLinks = await tx.query.bookAuthors.findMany({
                    where: eq(bookAuthors.bookId, bookId)
                });
                const existingAuthorIds = existingLinks.map(l => l.authorId);

                // Identify removed authors
                existingAuthorIds.forEach(id => {
                    if (!authorIds.includes(id)) removedAuthorIds.push(id);
                });

                // Remove existing
                await tx.delete(bookAuthors).where(eq(bookAuthors.bookId, bookId));

                // Insert new
                if (authorIds.length > 0) {
                    await tx.insert(bookAuthors).values(
                        authorIds.map(aid => ({
                            bookId: bookId,
                            authorId: aid
                        }))
                    );
                }

                // Update legacy authorId for backward compatibility (set to first author)
                // We must do this INSIDE transaction before deleting authors to avoid FK violation on 'books' table
                const newLegacyAuthorId = authorIds.length > 0 ? authorIds[0] : null;
                updateData.authorId = newLegacyAuthorId;
                await tx.update(books).set({ authorId: newLegacyAuthorId }).where(eq(books.id, bookId));

                // Handle Orphaned Authors & Highlight Migration
                if (removedAuthorIds.length > 0) {
                    const newPrimaryAuthorId = authorIds.length > 0 ? authorIds[0] : null;

                    for (const removedId of removedAuthorIds) {
                        // Check if this author has ANY other books
                        const otherBooks = await tx.query.bookAuthors.findMany({
                            where: and(
                                eq(bookAuthors.authorId, removedId),
                                ne(bookAuthors.bookId, bookId)
                            )
                        });

                        // If NO other books, they are now orphaned
                        if (otherBooks.length === 0) {
                            // 1. Migrate Highlights
                            if (newPrimaryAuthorId) {
                                await tx.update(highlights)
                                    .set({ authorId: newPrimaryAuthorId })
                                    .where(eq(highlights.authorId, removedId));
                            } else {
                                // If no other author, just nullify the author link in highlights
                                await tx.update(highlights)
                                    .set({ authorId: null })
                                    .where(eq(highlights.authorId, removedId));
                            }

                            // 2. Clear Author Levels
                            await tx.delete(authorLevels).where(eq(authorLevels.authorId, removedId));

                            // 3. Delete the orphaned author
                            await tx.delete(authors).where(eq(authors.id, removedId));
                        }
                    }
                }
            });

            // Trigger recalc if we touched authors
            if (removedAuthorIds.length > 0 || authorIds.length > 0) {
                const { recalculateStats } = await import('../services/stats.js');
                // Run in background
                recalculateStats().catch(err => console.error('Recalc failed:', err));
            }
        }

        // Apply other updates (genre, date) if needed
        // create formatted update object excluding what we already handled?
        // actually updateData keys (authorId) are already handled.
        // but safe to run update again or just filter.
        // Let's just remove authorId from updateData before running the second update
        delete updateData.authorId;

        if (Object.keys(updateData).length > 0) {
            await db.update(books)
                .set(updateData)
                .where(eq(books.id, bookId));
        }

        res.json({ success: true, ...updateData });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Fetch cover for specific book
router.post('/:id/cover/fetch', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const book = await db.query.books.findFirst({
            where: eq(books.id, bookId),
            with: { author: true }
        });

        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (!book.author) return res.status(400).json({ error: 'Book has no author' });

        const { coverUrl, genre } = await fetchBookCover(book.title, book.author.name);

        if (coverUrl || genre) {
            await db.update(books)
                .set({
                    ...(coverUrl ? { coverImage: coverUrl } : {}),
                    ...(genre ? { genre: genre } : {})
                })
                .where(eq(books.id, bookId));
            res.json({ success: true, coverImage: coverUrl, genre });
        } else {
            res.status(404).json({ error: 'No details found' });
        }
    } catch (e) {
        console.error('[cover/fetch] Error:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
