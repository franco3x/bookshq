import express from 'express';
import cors from 'cors';
import { db } from './database/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
// Default to 3001 to avoid conflict with Vite on 5005
const PORT = process.env.SERVER_PORT || 3001;

// Multer setup for file uploads
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

import { parseMyClippings } from './services/parser.js';
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

        res.json({
            success: true,
            message: `Imported ${result.createdCount} highlights. Skipped ${result.skippedCount} duplicates.`,
            stats: result
        });
    } catch (error) {
        console.error('Import failed:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

app.get('/api/books', async (req, res) => {
    try {
        const allBooks = await db.query.books.findMany({
            orderBy: desc(books.dateLastRead),
            with: {
                author: true,
            }
        });
        res.json(allBooks);
    } catch (e) {
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

app.get('/api/authors', async (req, res) => {
    try {
        const allAuthors = await db.query.authors.findMany({
            orderBy: authors.name,
            with: {
                books: true
            }
        });
        res.json(allAuthors);
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

app.get('/api/highlights', async (req, res) => {
    try {
        const allHighlights = await db.query.highlights.findMany({
            orderBy: desc(highlights.createdAt),
            with: {
                book: true,
                author: true
            },
            limit: 50 // Pagination later
        });
        res.json(allHighlights);
    } catch (e) {
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
        // Basic stats for now
        const [stats] = await db.select().from(userStats).limit(1);
        const highlightCount = await db.select({ count: sql`count(*)` }).from(highlights);
        const bookCount = await db.select({ count: sql`count(*)` }).from(books);

        res.json({
            ...stats,
            totalHighlights: highlightCount[0].count,
            totalBooks: bookCount[0].count
        });
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
