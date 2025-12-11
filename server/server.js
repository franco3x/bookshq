import express from 'express';
import cors from 'cors';
import { db } from './database/db.js';
import { books, authors, highlights, userStats, categoryLevels, authorLevels } from './database/schema.js';
import { eq, desc, sql, gt, and } from 'drizzle-orm';
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

app.get('/api/books', async (req, res) => {
    try {
        const result = await db
            .select({
                book: books,
                author: authors,
                highlightCount: sql`count(${highlights.id})`.mapWith(Number)
            })
            .from(books)
            .leftJoin(authors, eq(books.authorId, authors.id))
            .leftJoin(highlights, eq(books.id, highlights.bookId))
            .groupBy(books.id, authors.id)
            .orderBy(desc(books.dateLastRead));

        // Format for frontend: { ...bookFields, author: { ...authorFields }, highlightCount: 10 }
        const formatted = result.map(row => ({
            ...row.book,
            author: row.author,
            highlightCount: row.highlightCount
        }));

        res.json(formatted);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/books/:id', async (req, res) => {
    try {
        const book = await db.query.books.findFirst({
            where: eq(books.id, parseInt(req.params.id)),
            with: {
                author: true,
                highlights: {
                    orderBy: desc(highlights.location) // or location?
                }
            }
        });
        if (!book) return res.status(404).json({ error: 'Book not found' });
        res.json(book);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/books/:id/read', async (req, res) => {
    const bookId = parseInt(req.params.id);

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

        // Award XP for reading
        const { onBookRead } = await import('./services/gamification.js');
        const xpResult = await onBookRead(isFirstRead);

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

// Bulk update tags for multiple books
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

// Update book details (e.g., genre, dateLastRead)
app.patch('/api/books/:id', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const { genre, dateLastRead } = req.body;

        // Construct update object with only provided fields
        const updateData = {};
        if (genre !== undefined) updateData.genre = genre;
        if (dateLastRead !== undefined) updateData.dateLastRead = new Date(dateLastRead);

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        await db.update(books)
            .set(updateData)
            .where(eq(books.id, bookId));

        res.json({ success: true, ...updateData });
    } catch (e) {
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

app.get('/api/authors', async (req, res) => {
    try {
        // Fetch all authors with their books in one query
        const allAuthors = await db.query.authors.findMany({
            orderBy: authors.name,
            with: {
                books: true
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

        // Map the counts to authors (in-memory, super fast)
        const authorsWithCounts = allAuthors.map(author => ({
            ...author,
            books: author.books.map(book => ({
                ...book,
                highlightCount: countMap.get(book.id) || 0
            }))
        }));

        res.json(authorsWithCounts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/authors/:id', async (req, res) => {
    try {
        const author = await db.query.authors.findFirst({
            where: eq(authors.id, parseInt(req.params.id)),
            with: {
                books: true,
                highlights: true
            }
        });
        if (!author) return res.status(404).json({ error: 'Author not found' });
        res.json(author);
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
        const { gender, race, nationality } = req.body;

        // Construct update object with only provided fields
        const updateData = {};
        if (gender !== undefined) updateData.gender = gender;
        if (race !== undefined) updateData.race = race;
        if (nationality !== undefined) updateData.nationality = nationality;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        await db.update(authors)
            .set(updateData)
            .where(eq(authors.id, authorId));

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
