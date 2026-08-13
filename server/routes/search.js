import express from 'express';
import { db } from '../database/db.js';
import { books, authors, highlights } from '../database/schema.js';
import { ilike } from 'drizzle-orm';

const router = express.Router();

router.get('/', async (req, res) => {
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

export default router;
