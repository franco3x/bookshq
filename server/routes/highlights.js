import express from 'express';
import { db } from '../database/db.js';
import { highlights } from '../database/schema.js';
import { desc, sql } from 'drizzle-orm';

const router = express.Router();

router.get('/', async (req, res) => {
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

router.get('/random', async (req, res) => {
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

export default router;
