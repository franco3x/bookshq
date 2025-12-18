import express from 'express';
import cors from 'cors';
import { db } from './database/db.js';
import { books, authors, highlights, userStats, categoryLevels, authorLevels, bookAuthors, achievements, userAchievements } from './database/schema.js';
import { eq, desc, sql, gt, and, ne, inArray } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
// Default to 3001 to avoid conflict with Vite on 5005
const PORT = process.env.SERVER_PORT || 3001;

// Multer setup for file uploads
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

import { parseMyClippings } from './services/parser.js';
import { parseReadwiseCSV } from './services/readwise-parser.js';
import { saveHighlights } from './services/db-service.js';
import { importGoodreadsCSV } from './services/goodreads-import.js';
import { mergeBooks, mergeAuthors } from './services/merge-service.js';

app.use(cors());
app.use(express.json());

app.post('/api/import', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileContent = req.file.buffer.toString('utf-8');
        const clippings = parseMyClippings(fileContent);
        const result = await saveHighlights(clippings);
        res.json(result);
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import Readwise CSV
app.post('/api/import/readwise', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileContent = req.file.buffer.toString('utf-8');
        const clippings = parseReadwiseCSV(fileContent);
        const result = await saveHighlights(clippings);
        res.json(result);
    } catch (error) {
        console.error('Readwise import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import Goodreads CSV
app.post('/api/import/goodreads', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const fileContent = req.file.buffer.toString('utf-8');
        const results = await importGoodreadsCSV(fileContent);
        res.json(results);
    } catch (error) {
        console.error('Goodreads import error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/books', async (req, res) => {
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

// Merge Endpoints
app.post('/api/merge/books', async (req, res) => {
    const { targetId, sourceId } = req.body;
    if (!targetId || !sourceId) {
        return res.status(400).json({ error: 'Target ID and Source ID are required' });
    }

    try {
        const result = await mergeBooks(parseInt(targetId), parseInt(sourceId));
        res.json(result);
    } catch (e) {
        console.error('Book merge error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/merge/authors', async (req, res) => {
    const { targetId, sourceId } = req.body;
    if (!targetId || !sourceId) {
        return res.status(400).json({ error: 'Target ID and Source ID are required' });
    }

    try {
        const result = await mergeAuthors(parseInt(targetId), parseInt(sourceId));
        res.json(result);
    } catch (e) {
        console.error('Author merge error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/books/:id', async (req, res) => {
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

app.post('/api/books/:id/read', async (req, res, next) => {
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
        const { checkAchievements } = await import('./services/achievements.js');
        const newAchievements = await checkAchievements(1, ['READ']).catch(console.error);

        // Trigger XP Recalculation (includes new achievements)
        const { recalculateStats } = await import('./services/stats.js');
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
app.patch('/api/books/:id/read/decrement', async (req, res) => {
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
        const { recalculateStats } = await import('./services/stats.js');
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

// Manual Recalculate Stats Endpoint
app.post('/api/stats/recalculate', async (req, res) => {
    try {
        // Check achievements first
        const { checkAchievements } = await import('./services/achievements.js');
        await checkAchievements(1, ['ALL']);

        // Then recalculate stats
        const { recalculateStats } = await import('./services/stats.js');
        const success = await recalculateStats();

        if (success) {
            res.json({ success: true, message: 'Achievements checked and stats recalculated' });
        } else {
            res.status(500).json({ error: 'Recalculation failed check server logs' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Manual Achievement Check Endpoint
app.post('/api/achievements/check', async (req, res) => {
    try {
        const { checkAchievements } = await import('./services/achievements.js');
        const newUnlocks = await checkAchievements(1, ['ALL']);

        // Recalculate stats to include new XP
        const { recalculateStats } = await import('./services/stats.js');
        await recalculateStats().catch(console.error);

        res.json({ success: true, newUnlocks });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get User Achievements (List)
app.get('/api/achievements', async (req, res) => {
    try {
        const allAchievements = await db.query.achievements.findMany({
            orderBy: (achievements, { asc }) => [asc(achievements.xpReward)],
        });

        const userUnlocks = await db.query.userAchievements.findMany({
            where: eq(userAchievements.userId, 1)
        });

        const unlockMap = new Map(userUnlocks.map(ua => [ua.achievementId, ua]));

        const result = allAchievements.map(a => {
            const unlock = unlockMap.get(a.id);
            return {
                ...a,
                unlocked: !!(unlock?.unlockedAt),
                unlockedAt: unlock?.unlockedAt || null,
                progress: unlock?.progress || 0
            };
        });

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Bulk update tags for multiple books
// Bulk mark as read
app.post('/api/books/bulk/read', async (req, res) => {
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
            const { checkAchievements } = await import('./services/achievements.js');
            await checkAchievements(1, ['READ']);
        } catch (e) {
            console.error('[BulkRead] Achievement Error:', e);
        }

        try {
            const { recalculateStats } = await import('./services/stats.js');
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

app.post('/api/books/bulk/tags', async (req, res) => {
    try {
        const { bookIds, tags } = req.body;

        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ error: 'bookIds must be a non-empty array' });
        }

        if (!Array.isArray(tags)) {
            return res.status(400).json({ error: 'tags must be an array' });
        }

        // Update all specified books with the new tags
        const { inArray } = await import('drizzle-orm');
        await db.update(books)
            .set({ tags })
            .where(inArray(books.id, bookIds));

        res.json({ success: true, updated: bookIds.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update book details (e.g., genre, dateLastRead, authors)
app.patch('/api/books/:id', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const { genre, dateLastRead, authorIds } = req.body;

        const updateData = {};
        if (genre !== undefined) updateData.genre = genre;
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
                            }

                            // 2. Delete the orphaned author
                            // DB Constraints are now ON DELETE CASCADE for author_levels and book_authors
                            await tx.delete(authors).where(eq(authors.id, removedId));
                        }
                    }
                }
            });

            // Trigger recalc if we touched authors
            if (removedAuthorIds.length > 0 || authorIds.length > 0) {
                const { recalculateStats } = await import('./services/stats.js');
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

// Admin: Backfill covers
app.get('/api/admin/backfill-covers', async (req, res) => {
    try {
        const { fetchBookCover } = await import('./services/cover-fetcher.js');
        const booksWithoutCovers = await db.query.books.findMany({
            where: (books, { isNull }) => isNull(books.coverImage),
            with: { author: true }
        });

        console.log(`Found ${booksWithoutCovers.length} books without covers. Starting backfill...`);

        // Process in chunks to avoid rate limits
        let updatedCount = 0;
        for (const book of booksWithoutCovers) {
            if (!book.author) continue;

            const { coverUrl, genre } = await fetchBookCover(book.title, book.author.name);

            if (coverUrl || genre) {
                await db.update(books)
                    .set({
                        ...(coverUrl ? { coverImage: coverUrl } : {}),
                        ...(genre ? { genre: genre } : {})
                    })
                    .where(eq(books.id, book.id));

                updatedCount++;
                console.log(`Updated details for "${book.title}" (Genre: ${genre || 'None'})`);
            }
            // Small delay to be nice to API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        res.json({ success: true, total: booksWithoutCovers.length, updated: updatedCount });
    } catch (e) {
        console.error('Backfill error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Fetch cover for specific book
app.post('/api/books/:id/cover/fetch', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const book = await db.query.books.findFirst({
            where: eq(books.id, bookId),
            with: { author: true }
        });

        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (!book.author) return res.status(400).json({ error: 'Book has no author' });

        const { fetchBookCover } = await import('./services/cover-fetcher.js');
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
        res.status(500).json({ error: e.message });
    }
});

// Create new author
app.post('/api/authors', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Check if exists
        const existing = await db.query.authors.findFirst({
            where: eq(authors.name, name)
        });
        if (existing) return res.json(existing);

        const [newAuthor] = await db.insert(authors).values({ name }).returning();
        res.json(newAuthor);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/authors', async (req, res) => {
    try {
        // Fetch all authors with their books via bookAuthors junction
        const allAuthors = await db.query.authors.findMany({
            orderBy: authors.name,
            with: {
                bookAuthors: {
                    with: {
                        book: true
                    }
                }
            }
        });

        // Get ALL highlight counts for ALL books in a single query
        const highlightCounts = await db
            .select({
                bookId: highlights.bookId,
                count: sql`count(*)`.mapWith(Number)
            })
            .from(highlights)
            .groupBy(highlights.bookId);

        // Create a lookup map for O(1) access
        const countMap = new Map(highlightCounts.map(hc => [hc.bookId, hc.count]));

        // Fetch all author levels
        const levels = await db.query.authorLevels.findMany();
        const levelMap = new Map(levels.map(l => [l.authorId, { xp: l.xp, level: l.level }]));

        // Map the counts and levels to authors (in-memory, super fast)
        const authorsWithCounts = allAuthors.map(author => {
            // Flatten bookAuthors to books
            const books = author.bookAuthors.map(ba => ba.book);

            return {
                ...author,
                authorLevel: levelMap.get(author.id) || { xp: 0, level: 1 },
                books: books.map(book => ({
                    ...book,
                    highlightCount: countMap.get(book.id) || 0
                }))
            };
        });

        res.json(authorsWithCounts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/authors/:id', async (req, res) => {
    try {
        const authorId = parseInt(req.params.id);

        const author = await db.query.authors.findFirst({
            where: eq(authors.id, authorId),
            with: {
                bookAuthors: {
                    with: {
                        book: {
                            with: {
                                highlights: true
                            }
                        }
                    }
                },
                highlights: true
            }
        });

        if (!author) return res.status(404).json({ error: 'Author not found' });

        // Fetch the author level separately
        const authorLevel = await db.query.authorLevels.findFirst({
            where: eq(authorLevels.authorId, authorId)
        });

        // Flatten books
        const books = author.bookAuthors.map(ba => ba.book);

        // Add the level data to the response
        res.json({
            ...author,
            books: books, // Override/Add flattened books
            authorLevel: authorLevel || { xp: 0, level: 1 }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Fetch and save author demographics from Wikidata
app.post('/api/authors/:id/enrich', async (req, res) => {
    try {
        const authorId = parseInt(req.params.id);
        const author = await db.query.authors.findFirst({
            where: eq(authors.id, authorId)
        });

        if (!author) return res.status(404).json({ error: 'Author not found' });

        const { fetchAuthorDemographics } = await import('./services/author-enrichment.js');
        const demographics = await fetchAuthorDemographics(author.name);

        if (demographics && Object.keys(demographics).length > 0) {
            await db.update(authors)
                .set(demographics)
                .where(eq(authors.id, authorId));

            res.json({ success: true, demographics });
        } else {
            res.status(404).json({ error: 'No demographic data found' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Manually update author demographics
app.patch('/api/authors/:id', async (req, res) => {
    try {
        const authorId = parseInt(req.params.id);
        const { gender, race, nationality, birthYear, deathYear, bio, vocation } = req.body;

        // Construct update object with only provided fields
        const updateData = {};
        if (gender !== undefined) updateData.gender = gender; // Text
        if (race !== undefined) updateData.race = race;       // JSONB Array
        if (nationality !== undefined) updateData.nationality = nationality; // JSONB Array
        if (vocation !== undefined) updateData.vocation = vocation; // JSONB Array
        if (birthYear !== undefined) updateData.birthYear = birthYear; // Integer
        if (deathYear !== undefined) updateData.deathYear = deathYear; // Integer
        if (bio !== undefined) updateData.bio = bio; // Text

        // Helper: Title Case Normalization
        const normalize = (val) => {
            if (!val) return val;
            if (Array.isArray(val)) {
                return [...new Set(val.map(v => v.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())))];
            }
            return val.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        };

        // Apply Normalization
        if (updateData.gender) updateData.gender = normalize(updateData.gender);
        if (updateData.race) updateData.race = normalize(updateData.race);
        if (updateData.nationality) updateData.nationality = normalize(updateData.nationality);
        if (updateData.vocation) updateData.vocation = normalize(updateData.vocation);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        await db.update(authors)
            .set(updateData)
            .where(eq(authors.id, authorId));

        // Auto-recalculate stats in background
        const { recalculateStats } = await import('./services/stats.js');
        recalculateStats().catch(console.error);

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/highlights', async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        console.log(`Fetching highlights page ${page} (${limit} per page)...`);

        const allHighlights = await db.query.highlights.findMany({
            limit,
            offset,
            orderBy: desc(highlights.createdAt),
            with: {
                book: {
                    with: {
                        author: true
                    }
                }
            }
        });

        // Get total count for pagination metadata
        const [{ count }] = await db
            .select({ count: sql`count(*)`.mapWith(Number) })
            .from(highlights);

        console.log(`Returning ${allHighlights.length} highlights (page ${page}/${Math.ceil(count / limit)})`);

        res.json({
            data: allHighlights,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
                hasMore: page < Math.ceil(count / limit)
            }
        });
    } catch (e) {
        console.error('Error fetching highlights:', e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/highlights/random', async (req, res) => {
    try {
        // using raw sql for random sort which is cleaner than fetching all
        const randomHighlight = await db.query.highlights.findFirst({
            orderBy: sql`RANDOM()`,
            with: {
                book: true,
                author: true
            }
        });
        res.json(randomHighlight);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

import { or, like, ilike } from 'drizzle-orm';

app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ books: [], authors: [], highlights: [] });

    const query = `%${q}%`;

    try {
        const foundBooks = await db.query.books.findMany({
            where: ilike(books.title, query),
            limit: 5,
            with: { author: true }
        });

        const foundAuthors = await db.query.authors.findMany({
            where: ilike(authors.name, query),
            limit: 5
        });

        const foundHighlights = await db.query.highlights.findMany({
            where: ilike(highlights.text, query),
            limit: 10,
            with: { book: true, author: true }
        });

        res.json({
            books: foundBooks,
            authors: foundAuthors,
            highlights: foundHighlights
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.query.userStats.findFirst();

        // Count total highlights
        const highlightsCount = await db
            .select({ count: sql`count(*)`.mapWith(Number) })
            .from(highlights);

        // Count total books (Total Libary)
        const booksCount = await db
            .select({ count: sql`count(*)`.mapWith(Number) })
            .from(books);

        // Count books read (readCount > 0)
        const booksReadCount = await db
            .select({ count: sql`count(*)`.mapWith(Number) })
            .from(books)
            .where(gt(books.readCount, 0));

        res.json({
            ...stats,
            totalHighlights: highlightsCount[0].count,
            totalBooks: booksCount[0].count,
            booksRead: booksReadCount[0].count
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Category Levels (Genres, Demographics, Tags)
app.get('/api/stats/categories', async (req, res) => {
    try {
        const categories = await db.query.categoryLevels.findMany({
            orderBy: [desc(categoryLevels.level), desc(categoryLevels.xp)]
        });

        // Group by type for easier frontend consumption
        const grouped = {
            genre: categories.filter(c => c.categoryType === 'genre'),
            tag: categories.filter(c => c.categoryType === 'tag'),
            gender: categories.filter(c => c.categoryType === 'gender'),
            race: categories.filter(c => c.categoryType === 'race'),
            nationality: categories.filter(c => c.categoryType === 'nationality'),
            vocation: categories.filter(c => c.categoryType === 'vocation'),
        };

        res.json(grouped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Author Rankings (Top Leveled Authors)
app.get('/api/stats/authors/rankings', async (req, res) => {
    try {
        const rankings = await db.query.authorLevels.findMany({
            with: { author: true },
            orderBy: [desc(authorLevels.level), desc(authorLevels.xp)],
            limit: 50,
        });
        res.json(rankings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

import { generateObsidianExport } from './services/obsidian-exporter.js';

app.get('/api/export/obsidian', async (req, res) => {
    try {
        const zipBuffer = await generateObsidianExport();

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=kindlewise_export.zip');
        res.set('Content-Length', zipBuffer.length);

        res.send(zipBuffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Export failed' });
    }
});

import { generateHighlightImage } from './services/image-generator.js';

app.post('/api/export/image', async (req, res) => {
    const { text, title, author, coverUrl } = req.body;

    if (!text) return res.status(400).json({ error: 'Text required' });

    try {
        const imgBuffer = await generateHighlightImage(text, title || 'Unknown Book', author || 'Unknown Author', coverUrl);

        res.set('Content-Type', 'image/png');
        res.send(imgBuffer);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Image generation failed' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/db-check', async (req, res) => {
    try {
        const result = await db.execute(sql`SELECT NOW()`);
        res.json({ status: 'connected', result });
    } catch (error) {
        console.error('DB Connection Check Failed:', error);
        res.status(500).json({ status: 'error', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
